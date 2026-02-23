import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

// vi.hoisted ensures mockPrisma is available when vi.mock factory runs (hoisted)
const mockPrisma = vi.hoisted(() => ({
  employee: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
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
const passwordHash = bcrypt.hashSync('password123', 12);

const testEmployee = {
  id: 'emp-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash,
  employeeCode: 'EMP001',
  role: 'ADMIN',
  department: 'Engineering',
  designation: 'Senior Dev',
  isActive: true,
  deletedAt: null,
  registeredDeviceId: null,
  deviceModel: null,
  refreshTokenHash: null,
};

function makeAdminToken() {
  return jwt.sign(
    { id: 'emp-1', email: 'test@example.com', role: 'ADMIN' },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('returns 200 with tokens for valid credentials', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(testEmployee);
      mockPrisma.employee.update.mockResolvedValue(testEmployee);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.employee.email).toBe('test@example.com');
    });

    it('returns 401 for invalid password', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(testEmployee);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 401 for non-existent user', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 403 for inactive account', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        isActive: false,
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 200 with user data for valid token', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        name: 'Test User',
        email: 'test@example.com',
        employeeCode: 'EMP001',
        role: 'ADMIN',
        isActive: true,
      });

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${makeAdminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { id: 'emp-1', email: 'test@example.com', role: 'ADMIN' },
        config.jwt.refreshSecret,
        { expiresIn: '7d' }
      );
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        refreshTokenHash: hash,
      });
      mockPrisma.employee.update.mockResolvedValue(testEmployee);

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('returns 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('returns 500 when refresh flow hits operational errors', async () => {
      const refreshToken = jwt.sign(
        { id: 'emp-1', email: 'test@example.com', role: 'ADMIN' },
        config.jwt.refreshSecret,
        { expiresIn: '7d' }
      );

      mockPrisma.employee.findUnique.mockRejectedValue(new Error('database unavailable'));

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/reset-device', () => {
    it('returns 404 when employee does not exist', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/reset-device')
        .set('Authorization', `Bearer ${makeAdminToken()}`)
        .send({ employeeId: '8f8f7fd6-d2cc-4358-bf8b-f4f12d6ae24f' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('User not found');
      expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    });


    it('returns 404 when employee is soft deleted', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        deletedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/auth/reset-device')
        .set('Authorization', `Bearer ${makeAdminToken()}`)
        .send({ employeeId: '8f8f7fd6-d2cc-4358-bf8b-f4f12d6ae24f' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('User not found');
      expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    });



    it('returns 200 and writes audit log on successful reset', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(testEmployee);
      mockPrisma.employee.update.mockResolvedValue(testEmployee);

      const employeeId = '8f8f7fd6-d2cc-4358-bf8b-f4f12d6ae24f';
      const res = await request(app)
        .post('/auth/reset-device')
        .set('Authorization', `Bearer ${makeAdminToken()}`)
        .send({ employeeId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Device binding reset successfully');
      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: employeeId },
          data: {
            registeredDeviceId: null,
            deviceBoundAt: null,
            deviceModel: null,
          },
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'emp-1',
            action: 'DEVICE_RESET',
            targetType: 'employee',
            targetId: employeeId,
          }),
        })
      );
    });
  });
});
