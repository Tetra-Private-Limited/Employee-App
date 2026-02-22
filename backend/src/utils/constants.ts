export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const LOCATION_BATCH_MAX = 500;
export const GEOFENCE_DEFAULT_RADIUS = 100;
export const IMPOSSIBLE_TRAVEL_SPEED_KMH = 200;
export const EARTH_RADIUS_KM = 6371;

// Risk score weights
export const RISK_WEIGHTS = {
  MOCK_PROVIDER: 40,
  IMPOSSIBLE_TRAVEL: 30,
  LOW_SATELLITE_COUNT: 15,
  ROOTED_DEVICE: 30,
  SPOOFING_APP: 25,
  GNSS_ANOMALY: 20,
  SENSOR_MISMATCH: 20,
  INTEGRITY_FAILURE: 35,
} as const;

export const RISK_THRESHOLD = {
  LOW: 15,
  MEDIUM: 30,
  HIGH: 50,
  CRITICAL: 70,
} as const;

// Off-hours GPS interval (8pm to 8am)
export const OFF_HOURS = {
  start: 20, // 8 PM
  end: 8,    // 8 AM
  intervalMinutes: 60,
} as const;

export const WORK_HOURS = {
  start: 8,
  end: 20,
  intervalSeconds: 30,
} as const;
