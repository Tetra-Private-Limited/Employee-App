import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  geofence: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  employeeGeofence: {
    upsert: vi.fn(),
    findMany: vi.fn(),
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


function employeeToken() {
  return jwt.sign(
    { id: 'e1', email: 'employee@test.com', role: 'EMPLOYEE' },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );
}

describe('Geofences API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  describe('GET /geofences', () => {
    it('returns 200 with geofence list', async () => {
      mockPrisma.geofence.findMany.mockResolvedValue([
        { id: 'g1', name: 'Office', type: 'OFFICE', latitude: 28.6, longitude: 77.2, radiusMeters: 200, isActive: true, _count: { employeeGeofences: 5 } },
      ]);

      const res = await request(app)
        .get('/geofences')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Office');
    });
  });

  describe('POST /geofences', () => {
    it('returns 201 for valid geofence creation', async () => {
      mockPrisma.geofence.create.mockResolvedValue({
        id: 'g-new',
        name: 'Warehouse',
        latitude: 28.5,
        longitude: 77.3,
        radiusMeters: 300,
        type: 'WAREHOUSE',
      });

      const res = await request(app)
        .post('/geofences')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          name: 'Warehouse',
          latitude: 28.5,
          longitude: 77.3,
          radiusMeters: 300,
          type: 'WAREHOUSE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Warehouse');
    });
  });


  describe('GET /geofences/my', () => {
    it('returns assigned active geofences for authenticated employee', async () => {
      mockPrisma.employeeGeofence.findMany.mockResolvedValue([
        {
          employeeId: 'e1',
          geofenceId: 'g1',
          geofence: {
            id: 'g1',
            name: 'HQ',
            latitude: 28.6139,
            longitude: 77.209,
            radiusMeters: 200,
            type: 'OFFICE',
            isActive: true,
            deletedAt: null,
          },
        },
      ]);

      const res = await request(app)
        .get('/geofences/my')
        .set('Authorization', `Bearer ${employeeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('g1');
      expect(mockPrisma.employeeGeofence.findMany).toHaveBeenCalledWith({
        where: {
          employeeId: 'e1',
          geofence: {
            deletedAt: null,
            isActive: true,
          },
        },
        include: {
          geofence: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      });
    });
  });

  describe('GET /geofences/:id/check', () => {
    it('returns inside:true for point within geofence', async () => {
      mockPrisma.geofence.findFirst.mockResolvedValue({
        id: 'g1',
        latitude: 28.6139,
        longitude: 77.209,
        radiusMeters: 500,
        deletedAt: null,
      });

      const res = await request(app)
        .get('/geofences/g1/check?latitude=28.6139&longitude=77.209')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inside).toBe(true);
    });

    it('returns inside:false for point outside geofence', async () => {
      mockPrisma.geofence.findFirst.mockResolvedValue({
        id: 'g1',
        latitude: 28.6139,
        longitude: 77.209,
        radiusMeters: 100,
        deletedAt: null,
      });

      const res = await request(app)
        .get('/geofences/g1/check?latitude=28.624&longitude=77.209')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inside).toBe(false);
    });
  });
});
