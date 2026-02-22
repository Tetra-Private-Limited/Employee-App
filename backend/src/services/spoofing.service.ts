import { prisma } from '../config/prisma.js';
import { AlertType, AlertSeverity } from '@prisma/client';
import { detectImpossibleTravel } from './location.service.js';
import { RISK_WEIGHTS, RISK_THRESHOLD } from '../utils/constants.js';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  provider: string | null;
  isMock: boolean;
  satelliteCount: number | null;
  snrAverage: number | null;
  accelerometerX: number | null;
  accelerometerY: number | null;
  accelerometerZ: number | null;
  recordedAt: Date;
}

interface RiskResult {
  riskScore: number;
  severity: AlertSeverity;
  alerts: Array<{ type: AlertType; details: any; score: number }>;
}

export function computeRiskScore(
  current: LocationData,
  previous: LocationData | null
): RiskResult {
  let totalRisk = 0;
  const alerts: Array<{ type: AlertType; details: any; score: number }> = [];

  // 1. Mock provider detection (client flag - but we still check)
  if (current.isMock) {
    totalRisk += RISK_WEIGHTS.MOCK_PROVIDER;
    alerts.push({
      type: 'MOCK_LOCATION',
      details: { provider: current.provider },
      score: RISK_WEIGHTS.MOCK_PROVIDER,
    });
  }

  // 2. Impossible travel detection
  if (previous) {
    const { impossible, speedKmh } = detectImpossibleTravel(
      previous.latitude,
      previous.longitude,
      previous.recordedAt,
      current.latitude,
      current.longitude,
      current.recordedAt
    );
    if (impossible) {
      totalRisk += RISK_WEIGHTS.IMPOSSIBLE_TRAVEL;
      alerts.push({
        type: 'IMPOSSIBLE_TRAVEL',
        details: { speedKmh: Math.round(speedKmh), fromLat: previous.latitude, fromLon: previous.longitude },
        score: RISK_WEIGHTS.IMPOSSIBLE_TRAVEL,
      });
    }
  }

  // 3. GNSS anomaly - GPS provider but low/no satellites
  if (current.provider === 'gps' && current.satelliteCount !== null) {
    if (current.satelliteCount < 4) {
      totalRisk += RISK_WEIGHTS.LOW_SATELLITE_COUNT;
      alerts.push({
        type: 'GNSS_ANOMALY',
        details: { satelliteCount: current.satelliteCount, expected: '>=4' },
        score: RISK_WEIGHTS.LOW_SATELLITE_COUNT,
      });
    }
  }

  // 4. SNR anomaly - abnormally uniform signal strength indicates spoofing
  if (current.snrAverage !== null && current.snrAverage > 0) {
    // Real GPS typically has SNR variance; uniform high SNR is suspicious
    if (current.snrAverage > 45) {
      totalRisk += RISK_WEIGHTS.GNSS_ANOMALY;
      alerts.push({
        type: 'GNSS_ANOMALY',
        details: { snrAverage: current.snrAverage, reason: 'abnormally_high_uniform_snr' },
        score: RISK_WEIGHTS.GNSS_ANOMALY,
      });
    }
  }

  // 5. Sensor fusion mismatch - GPS says moving but accelerometer says still
  if (
    current.speed !== null &&
    current.speed > 5 && // >18 km/h
    current.accelerometerX !== null &&
    current.accelerometerY !== null &&
    current.accelerometerZ !== null
  ) {
    const accelMagnitude = Math.sqrt(
      current.accelerometerX ** 2 +
      current.accelerometerY ** 2 +
      current.accelerometerZ ** 2
    );
    // If acceleration magnitude is close to gravity (9.8) with no variation, device is stationary
    if (Math.abs(accelMagnitude - 9.8) < 0.5) {
      totalRisk += RISK_WEIGHTS.SENSOR_MISMATCH;
      alerts.push({
        type: 'SENSOR_MISMATCH',
        details: {
          gpsSpeed: current.speed,
          accelMagnitude,
          reason: 'gps_moving_but_accelerometer_stationary',
        },
        score: RISK_WEIGHTS.SENSOR_MISMATCH,
      });
    }
  }

  // Determine severity
  let severity: AlertSeverity = 'LOW';
  if (totalRisk >= RISK_THRESHOLD.CRITICAL) severity = 'CRITICAL';
  else if (totalRisk >= RISK_THRESHOLD.HIGH) severity = 'HIGH';
  else if (totalRisk >= RISK_THRESHOLD.MEDIUM) severity = 'MEDIUM';

  return { riskScore: Math.min(totalRisk, 100), severity, alerts };
}

export async function analyzeAndSaveAlerts(
  employeeId: string,
  locationRecordId: string,
  riskResult: RiskResult
) {
  if (riskResult.alerts.length === 0) return;

  const alertsToCreate = riskResult.alerts.map((alert) => ({
    employeeId,
    alertType: alert.type,
    details: alert.details,
    locationRecordId,
    severity: riskResult.severity,
    riskScore: riskResult.riskScore,
  }));

  await prisma.spoofingAlert.createMany({ data: alertsToCreate });
}
