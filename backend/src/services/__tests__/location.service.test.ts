import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  isInsideGeofence,
  calculateRouteDistance,
  detectImpossibleTravel,
  detectStops,
} from '../location.service.js';

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    const d = haversineDistance(28.6139, 77.209, 28.6139, 77.209);
    expect(d).toBe(0);
  });

  it('calculates Mumbai to Delhi distance (~1150km)', () => {
    // Mumbai: 19.076, 72.8777 — Delhi: 28.6139, 77.209
    const d = haversineDistance(19.076, 72.8777, 28.6139, 77.209);
    const km = d / 1000;
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1200);
  });

  it('calculates a short distance accurately', () => {
    // ~111m (approximately 0.001 degrees latitude at equator)
    const d = haversineDistance(0, 0, 0.001, 0);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe('isInsideGeofence', () => {
  const officeLat = 28.6139;
  const officeLon = 77.209;
  const radius = 500; // 500 meters

  it('returns true for a point inside the radius', () => {
    expect(isInsideGeofence(28.6139, 77.209, officeLat, officeLon, radius)).toBe(true);
  });

  it('returns true for a point near the center', () => {
    // ~100m north of office
    expect(isInsideGeofence(28.6148, 77.209, officeLat, officeLon, radius)).toBe(true);
  });

  it('returns false for a point outside the radius', () => {
    // ~1km away
    expect(isInsideGeofence(28.624, 77.209, officeLat, officeLon, radius)).toBe(false);
  });
});

describe('calculateRouteDistance', () => {
  it('returns 0 for empty array', () => {
    expect(calculateRouteDistance([])).toBe(0);
  });

  it('returns 0 for single point', () => {
    expect(calculateRouteDistance([{ latitude: 28.6139, longitude: 77.209 }])).toBe(0);
  });

  it('sums distances for multi-point route', () => {
    const route = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.001, longitude: 0 },
      { latitude: 0.002, longitude: 0 },
    ];
    const d = calculateRouteDistance(route);
    // Two segments of ~111m each
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(250);
  });
});

describe('detectImpossibleTravel', () => {
  it('returns not impossible for normal travel speed', () => {
    const t1 = new Date('2026-01-01T10:00:00Z');
    const t2 = new Date('2026-01-01T11:00:00Z');
    // ~111km in 1 hour = 111 km/h (under 200 km/h threshold)
    const result = detectImpossibleTravel(0, 0, t1, 1, 0, t2);
    expect(result.impossible).toBe(false);
    expect(result.speedKmh).toBeGreaterThan(100);
    expect(result.speedKmh).toBeLessThan(120);
  });

  it('returns impossible for teleportation speed', () => {
    const t1 = new Date('2026-01-01T10:00:00Z');
    const t2 = new Date('2026-01-01T10:01:00Z');
    // ~111km in 1 minute = 6660 km/h
    const result = detectImpossibleTravel(0, 0, t1, 1, 0, t2);
    expect(result.impossible).toBe(true);
    expect(result.speedKmh).toBeGreaterThan(200);
  });

  it('handles zero time difference', () => {
    const t = new Date('2026-01-01T10:00:00Z');
    const result = detectImpossibleTravel(0, 0, t, 1, 0, t);
    expect(result.impossible).toBe(true);
    expect(result.speedKmh).toBe(Infinity);
  });

  it('handles zero time difference at same point', () => {
    const t = new Date('2026-01-01T10:00:00Z');
    const result = detectImpossibleTravel(0, 0, t, 0, 0, t);
    expect(result.impossible).toBe(false);
  });
});

describe('detectStops', () => {
  it('returns empty for single point', () => {
    expect(detectStops([{ latitude: 0, longitude: 0, recordedAt: new Date() }])).toEqual([]);
  });

  it('detects a stop when location stays within radius for >5 min', () => {
    const base = new Date('2026-01-01T10:00:00Z');
    const locations = [
      { latitude: 0, longitude: 0, recordedAt: new Date(base.getTime()) },
      { latitude: 0.00001, longitude: 0, recordedAt: new Date(base.getTime() + 3 * 60000) },
      { latitude: 0.00002, longitude: 0, recordedAt: new Date(base.getTime() + 6 * 60000) },
      // Move away to trigger stop detection
      { latitude: 1, longitude: 1, recordedAt: new Date(base.getTime() + 7 * 60000) },
    ];
    const stops = detectStops(locations);
    expect(stops.length).toBe(1);
    expect(stops[0].durationMinutes).toBe(6);
  });

  it('returns empty for moving locations', () => {
    const base = new Date('2026-01-01T10:00:00Z');
    const locations = [
      { latitude: 0, longitude: 0, recordedAt: new Date(base.getTime()) },
      { latitude: 1, longitude: 0, recordedAt: new Date(base.getTime() + 60000) },
      { latitude: 2, longitude: 0, recordedAt: new Date(base.getTime() + 120000) },
    ];
    expect(detectStops(locations)).toEqual([]);
  });
});
