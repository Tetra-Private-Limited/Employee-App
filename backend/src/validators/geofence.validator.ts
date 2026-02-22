import { z } from 'zod';

export const createGeofenceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(50).max(10000).default(100),
  type: z.enum(['OFFICE', 'CLIENT', 'WAREHOUSE', 'CUSTOM']).default('OFFICE'),
});

export const updateGeofenceSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().min(50).max(10000).optional(),
  type: z.enum(['OFFICE', 'CLIENT', 'WAREHOUSE', 'CUSTOM']).optional(),
  isActive: z.boolean().optional(),
});

export const assignGeofenceSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
});

export const checkGeofenceSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
