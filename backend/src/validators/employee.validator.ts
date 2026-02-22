import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employeeCode: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

export const resetDeviceSchema = z.object({
  employeeId: z.string().uuid(),
});

export const employeeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
});
