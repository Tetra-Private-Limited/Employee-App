import { EARTH_RADIUS_KM, IMPOSSIBLE_TRAVEL_SPEED_KMH } from '../utils/constants.js';

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * 1000; // returns meters
}

export function isInsideGeofence(
  lat: number,
  lon: number,
  geofenceLat: number,
  geofenceLon: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(lat, lon, geofenceLat, geofenceLon);
  return distance <= radiusMeters;
}

export function calculateRouteDistance(
  locations: Array<{ latitude: number; longitude: number }>
): number {
  let totalMeters = 0;
  for (let i = 1; i < locations.length; i++) {
    totalMeters += haversineDistance(
      locations[i - 1].latitude,
      locations[i - 1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );
  }
  return totalMeters;
}

export function detectImpossibleTravel(
  lat1: number,
  lon1: number,
  time1: Date,
  lat2: number,
  lon2: number,
  time2: Date
): { impossible: boolean; speedKmh: number } {
  const distanceMeters = haversineDistance(lat1, lon1, lat2, lon2);
  const timeDiffSeconds = Math.abs(time2.getTime() - time1.getTime()) / 1000;

  if (timeDiffSeconds === 0) {
    return { impossible: distanceMeters > 10, speedKmh: Infinity };
  }

  const speedKmh = (distanceMeters / 1000) / (timeDiffSeconds / 3600);

  return {
    impossible: speedKmh > IMPOSSIBLE_TRAVEL_SPEED_KMH,
    speedKmh,
  };
}

export function detectStops(
  locations: Array<{ latitude: number; longitude: number; recordedAt: Date }>,
  minStopDurationMinutes = 5,
  maxStopRadiusMeters = 50
): Array<{ latitude: number; longitude: number; startTime: Date; endTime: Date; durationMinutes: number }> {
  const stops: Array<{ latitude: number; longitude: number; startTime: Date; endTime: Date; durationMinutes: number }> = [];

  if (locations.length < 2) return stops;

  let stopStart = 0;
  for (let i = 1; i < locations.length; i++) {
    const distance = haversineDistance(
      locations[stopStart].latitude,
      locations[stopStart].longitude,
      locations[i].latitude,
      locations[i].longitude
    );

    if (distance > maxStopRadiusMeters) {
      const duration =
        (locations[i - 1].recordedAt.getTime() - locations[stopStart].recordedAt.getTime()) / 60000;
      if (duration >= minStopDurationMinutes) {
        stops.push({
          latitude: locations[stopStart].latitude,
          longitude: locations[stopStart].longitude,
          startTime: locations[stopStart].recordedAt,
          endTime: locations[i - 1].recordedAt,
          durationMinutes: Math.round(duration),
        });
      }
      stopStart = i;
    }
  }

  // Check last segment
  const lastDuration =
    (locations[locations.length - 1].recordedAt.getTime() - locations[stopStart].recordedAt.getTime()) / 60000;
  if (lastDuration >= minStopDurationMinutes) {
    stops.push({
      latitude: locations[stopStart].latitude,
      longitude: locations[stopStart].longitude,
      startTime: locations[stopStart].recordedAt,
      endTime: locations[locations.length - 1].recordedAt,
      durationMinutes: Math.round(lastDuration),
    });
  }

  return stops;
}
