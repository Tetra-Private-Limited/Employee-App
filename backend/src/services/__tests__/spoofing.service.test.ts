import { describe, it, expect, vi } from 'vitest';

// Mock prisma before importing the module that uses it
vi.mock('../../config/prisma.js', () => ({
  prisma: {},
}));

import { computeRiskScore } from '../spoofing.service.js';
import { RISK_WEIGHTS, RISK_THRESHOLD } from '../../utils/constants.js';

function makeLocation(overrides: Partial<Parameters<typeof computeRiskScore>[0]> = {}) {
  return {
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 10,
    speed: null,
    provider: 'gps',
    isMock: false,
    satelliteCount: 12,
    snrAverage: 30,
    accelerometerX: null,
    accelerometerY: null,
    accelerometerZ: null,
    recordedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

describe('computeRiskScore', () => {
  it('returns zero score for clean location', () => {
    const result = computeRiskScore(makeLocation(), null);
    expect(result.riskScore).toBe(0);
    expect(result.alerts).toHaveLength(0);
    expect(result.severity).toBe('LOW');
  });

  it('detects mock location', () => {
    const result = computeRiskScore(makeLocation({ isMock: true }), null);
    expect(result.riskScore).toBeGreaterThanOrEqual(RISK_WEIGHTS.MOCK_PROVIDER);
    expect(result.alerts.some((a) => a.type === 'MOCK_LOCATION')).toBe(true);
  });

  it('detects impossible travel', () => {
    const previous = makeLocation({
      latitude: 0,
      longitude: 0,
      recordedAt: new Date('2026-01-01T10:00:00Z'),
    });
    const current = makeLocation({
      latitude: 10,
      longitude: 10,
      recordedAt: new Date('2026-01-01T10:01:00Z'),
    });
    const result = computeRiskScore(current, previous);
    expect(result.alerts.some((a) => a.type === 'IMPOSSIBLE_TRAVEL')).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(RISK_WEIGHTS.IMPOSSIBLE_TRAVEL);
  });

  it('does not flag impossible travel for normal movement', () => {
    const previous = makeLocation({
      latitude: 0,
      longitude: 0,
      recordedAt: new Date('2026-01-01T10:00:00Z'),
    });
    const current = makeLocation({
      latitude: 0.001,
      longitude: 0,
      recordedAt: new Date('2026-01-01T10:01:00Z'),
    });
    const result = computeRiskScore(current, previous);
    expect(result.alerts.some((a) => a.type === 'IMPOSSIBLE_TRAVEL')).toBe(false);
  });

  it('detects GNSS anomaly for low satellite count', () => {
    const result = computeRiskScore(
      makeLocation({ provider: 'gps', satelliteCount: 2 }),
      null
    );
    expect(result.alerts.some((a) => a.type === 'GNSS_ANOMALY')).toBe(true);
  });

  it('does not flag GNSS for adequate satellites', () => {
    const result = computeRiskScore(
      makeLocation({ provider: 'gps', satelliteCount: 10 }),
      null
    );
    expect(result.alerts.filter((a) => a.type === 'GNSS_ANOMALY')).toHaveLength(0);
  });

  it('detects abnormally high SNR', () => {
    const result = computeRiskScore(makeLocation({ snrAverage: 50 }), null);
    expect(result.alerts.some((a) => a.type === 'GNSS_ANOMALY')).toBe(true);
  });

  it('detects sensor mismatch (GPS moving, accelerometer stationary)', () => {
    // speed > 5 m/s, accel magnitude ≈ 9.8 (gravity only = stationary)
    const result = computeRiskScore(
      makeLocation({
        speed: 10,
        accelerometerX: 0,
        accelerometerY: 0,
        accelerometerZ: 9.8,
      }),
      null
    );
    expect(result.alerts.some((a) => a.type === 'SENSOR_MISMATCH')).toBe(true);
  });

  it('does not flag sensor mismatch when speed is low', () => {
    const result = computeRiskScore(
      makeLocation({
        speed: 2,
        accelerometerX: 0,
        accelerometerY: 0,
        accelerometerZ: 9.8,
      }),
      null
    );
    expect(result.alerts.some((a) => a.type === 'SENSOR_MISMATCH')).toBe(false);
  });

  it('accumulates multiple risk factors', () => {
    const previous = makeLocation({
      latitude: 0,
      longitude: 0,
      recordedAt: new Date('2026-01-01T10:00:00Z'),
    });
    const current = makeLocation({
      isMock: true,
      latitude: 10,
      longitude: 10,
      recordedAt: new Date('2026-01-01T10:01:00Z'),
      provider: 'gps',
      satelliteCount: 1,
    });
    const result = computeRiskScore(current, previous);
    expect(result.alerts.length).toBeGreaterThanOrEqual(3);
    expect(result.riskScore).toBeGreaterThanOrEqual(
      RISK_WEIGHTS.MOCK_PROVIDER + RISK_WEIGHTS.IMPOSSIBLE_TRAVEL + RISK_WEIGHTS.LOW_SATELLITE_COUNT
    );
  });

  it('assigns correct severity levels', () => {
    // Mock only → 40 → MEDIUM (>= 30)
    const medium = computeRiskScore(makeLocation({ isMock: true }), null);
    expect(medium.severity).toBe('MEDIUM');

    // Mock + impossible travel → 70 → CRITICAL (>= 70)
    const previous = makeLocation({
      latitude: 0,
      longitude: 0,
      recordedAt: new Date('2026-01-01T10:00:00Z'),
    });
    const critical = computeRiskScore(
      makeLocation({
        isMock: true,
        latitude: 10,
        longitude: 10,
        recordedAt: new Date('2026-01-01T10:01:00Z'),
      }),
      previous
    );
    expect(critical.severity).toBe('CRITICAL');
  });

  it('caps risk score at 100', () => {
    const previous = makeLocation({
      latitude: 0,
      longitude: 0,
      recordedAt: new Date('2026-01-01T10:00:00Z'),
    });
    const current = makeLocation({
      isMock: true,
      latitude: 10,
      longitude: 10,
      recordedAt: new Date('2026-01-01T10:01:00Z'),
      provider: 'gps',
      satelliteCount: 1,
      snrAverage: 50,
      speed: 10,
      accelerometerX: 0,
      accelerometerY: 0,
      accelerometerZ: 9.8,
    });
    const result = computeRiskScore(current, previous);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});
