import { z } from 'zod';

const locationRecordSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  bearing: z.number().nullable().optional(),
  provider: z.string().nullable().optional(),
  isMock: z.boolean().default(false),
  batteryLevel: z.number().min(0).max(100).nullable().optional(),
  deviceId: z.string().nullable().optional(),
  // Raw anti-spoofing metadata (server computes risk)
  satelliteCount: z.number().nullable().optional(),
  snrAverage: z.number().nullable().optional(),
  accelerometerX: z.number().nullable().optional(),
  accelerometerY: z.number().nullable().optional(),
  accelerometerZ: z.number().nullable().optional(),
  recordedAt: z.string().or(z.number()),
});

export const locationBatchSchema = z.object({
  locations: z.array(locationRecordSchema).min(1).max(500),
  deviceId: z.string().optional(),
  integrityToken: z.string().optional(),
});

export const locationQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: z.string(),
  endDate: z.string(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(100),
});
