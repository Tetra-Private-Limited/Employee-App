import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn().mockResolvedValue(10),
  },
  attendance: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(5),
  },
  locationRecord: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  spoofingAlert: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(2),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { createTestApp } from '../helpers.js';

const app = createTestApp();

function adminToken() {
  return jwt.sign(
    { id: 'u1', email: 'admin@test.com', role: 'ADMIN' },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );
}

describe('Reports API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.employee.count.mockResolvedValue(10);
    mockPrisma.attendance.count.mockResolvedValue(5);
    mockPrisma.spoofingAlert.count.mockResolvedValue(2);
    mockPrisma.locationRecord.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  describe('GET /reports/dashboard', () => {
    it('returns 200 with dashboard stats', async () => {
      const res = await request(app)
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalEmployees');
      expect(res.body.data).toHaveProperty('activeEmployees');
      expect(res.body.data).toHaveProperty('presentToday');
      expect(res.body.data).toHaveProperty('inField');
      expect(res.body.data).toHaveProperty('alertsToday');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/reports/dashboard');
      expect(res.status).toBe(401);
    });

    it('returns 403 for EMPLOYEE role', async () => {
      const empToken = jwt.sign(
        { id: 'u2', email: 'emp@test.com', role: 'EMPLOYEE' },
        config.jwt.accessSecret,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${empToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /reports/alerts/recent', () => {
    it('returns 200 with recent alerts', async () => {
      mockPrisma.spoofingAlert.findMany.mockResolvedValue([
        {
          id: 'a1',
          alertType: 'MOCK_LOCATION',
          severity: 'HIGH',
          riskScore: 50,
          createdAt: new Date(),
          employee: { id: 'e1', name: 'Test', employeeCode: 'E001' },
        },
      ]);

      const res = await request(app)
        .get('/reports/alerts/recent')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /reports/attendance', () => {
    it('returns 400 without required date params', async () => {
      const res = await request(app)
        .get('/reports/attendance')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('startDate');
    });

    it('returns 200 with date params', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/reports/attendance?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
