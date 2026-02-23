import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
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

function makeToken(role: string) {
  return jwt.sign(
    { id: 'u1', email: 'test@example.com', role },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );
}

describe('Employees API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.employee.findMany.mockResolvedValue([]);
    mockPrisma.employee.count.mockResolvedValue(0);
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  describe('GET /employees', () => {
    it('returns 200 with paginated list for ADMIN', async () => {
      const employees = [
        { id: '1', name: 'Alice', email: 'alice@test.com', employeeCode: 'E001', role: 'EMPLOYEE' },
      ];
      mockPrisma.employee.findMany.mockResolvedValue(employees);
      mockPrisma.employee.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/employees');
      expect(res.status).toBe(401);
    });

    it('returns 403 for EMPLOYEE role', async () => {
      const res = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 for MANAGER role', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ department: 'Eng' });
      mockPrisma.employee.findMany.mockResolvedValue([]);
      mockPrisma.employee.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${makeToken('MANAGER')}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /employees/:id', () => {
    it('returns 200 with employee detail', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        _count: { attendance: 5, locationRecords: 100, spoofingAlerts: 0 },
      });

      const res = await request(app)
        .get('/employees/1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alice');
    });

    it('returns 404 for non-existent employee', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/employees/nonexistent')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /employees', () => {
    it('returns 201 for valid creation by ADMIN', async () => {
      mockPrisma.employee.create.mockResolvedValue({
        id: 'new-1',
        name: 'Bob',
        email: 'bob@test.com',
        employeeCode: 'E002',
        role: 'EMPLOYEE',
      });

      const res = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({
          name: 'Bob',
          email: 'bob@test.com',
          password: 'secure123',
          employeeCode: 'E002',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Bob');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'Bob' });

      expect(res.status).toBe(400);
    });

    it('returns 403 for EMPLOYEE role trying to create', async () => {
      const res = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({
          name: 'Bob',
          email: 'bob@test.com',
          password: 'secure123',
          employeeCode: 'E002',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /employees/:id', () => {
    it('returns 200 for soft delete by ADMIN', async () => {
      mockPrisma.employee.update.mockResolvedValue({});

      const res = await request(app)
        .delete('/employees/1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
  });
});
