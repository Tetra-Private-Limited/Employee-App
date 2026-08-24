import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  attendance: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { createTestApp } from '../helpers.js';

const app = createTestApp();

function makeToken(role: string, id = 'u1') {
  return jwt.sign({ id, email: 'test@example.com', role }, config.jwt.accessSecret, {
    expiresIn: '1h',
  });
}

describe('Attendance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    mockPrisma.attendance.count.mockResolvedValue(0);
    // No open session and no prior sessions today by default.
    mockPrisma.attendance.findFirst.mockResolvedValue(null);
    mockPrisma.attendance.create.mockResolvedValue({ id: 'a1', status: 'PRESENT' });
    // No device bound by default, so verifyDeviceBinding passes through
    // unless a test explicitly wants to exercise the mismatch case.
    mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: null });
  });

  describe('GET /attendance', () => {
    it('forces an EMPLOYEE to their own records regardless of an employeeId query param', async () => {
      const res = await request(app)
        .get('/attendance?employeeId=someone-else')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE', 'u1')}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { employeeId: 'u1' } })
      );
    });

    it('scopes a MANAGER with no employeeId filter to their direct reports', async () => {
      const res = await request(app)
        .get('/attendance')
        .set('Authorization', `Bearer ${makeToken('MANAGER', 'mgr-1')}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employee: expect.objectContaining({ managerId: 'mgr-1' }),
          }),
        })
      );
    });

    it('returns 403 when a MANAGER requests an employeeId outside their team', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/attendance?employeeId=not-my-report')
        .set('Authorization', `Bearer ${makeToken('MANAGER', 'mgr-1')}`);

      expect(res.status).toBe(403);
      expect(mockPrisma.attendance.findMany).not.toHaveBeenCalled();
    });

    it('allows a MANAGER to filter to a confirmed direct report', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue({ id: 'report-1' });

      const res = await request(app)
        .get('/attendance?employeeId=report-1')
        .set('Authorization', `Bearer ${makeToken('MANAGER', 'mgr-1')}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ employeeId: 'report-1' }) })
      );
    });

    it('allows ADMIN to filter by any employeeId', async () => {
      const res = await request(app)
        .get('/attendance?employeeId=anyone')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ employeeId: 'anyone' }) })
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/attendance');
      expect(res.status).toBe(401);
    });
  });

  describe('day bucketing uses the org timezone (defaults to UTC in tests)', () => {
    it('POST /attendance/time-in buckets under an org-midnight date, not a server-local one', async () => {
      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4 });

      expect(res.status).toBe(201);
      const call = mockPrisma.attendance.create.mock.calls[0][0];
      const bucketDate: Date = call.data.date;
      expect(bucketDate.getUTCHours()).toBe(0);
      expect(bucketDate.getUTCMinutes()).toBe(0);
      expect(bucketDate.getUTCSeconds()).toBe(0);
      expect(bucketDate.getUTCMilliseconds()).toBe(0);
    });

    it('GET /attendance/today looks up the same org-midnight bucket', async () => {
      const res = await request(app)
        .get('/attendance/today')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`);

      expect(res.status).toBe(200);
      const call = mockPrisma.attendance.findFirst.mock.calls[0][0];
      const bucketDate: Date = call.where.date;
      expect(bucketDate.getUTCHours()).toBe(0);
      expect(bucketDate.getUTCMinutes()).toBe(0);
    });
  });

  describe('multiple clock-in/out sessions per day', () => {
    it('rejects a second clock-in while a session is already open', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({ id: 'open-1', timeOut: null });

      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4 });

      expect(res.status).toBe(400);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('allows clocking in again after an earlier session today was already closed', async () => {
      // No open session right now, but one earlier session already happened today.
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.count.mockResolvedValue(1);

      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4 });

      expect(res.status).toBe(201);
      expect(mockPrisma.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ employeeId: 'u1' }) })
      );
    });

    it('only the first session of the day can be marked LATE', async () => {
      vi.useFakeTimers();
      // 10:00 UTC — well past the default 9:15 late threshold (office starts
      // 9am, 15 min grace).
      vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'));

      try {
        // First session of the day: count is 0.
        mockPrisma.attendance.count.mockResolvedValue(0);
        await request(app)
          .post('/attendance/time-in')
          .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
          .send({ latitude: 23.8, longitude: 90.4 });

        expect(mockPrisma.attendance.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: 'LATE' }) })
        );

        mockPrisma.attendance.create.mockClear();

        // Second session of the day at the same (late) time of day: count is 1.
        mockPrisma.attendance.count.mockResolvedValue(1);
        await request(app)
          .post('/attendance/time-in')
          .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
          .send({ latitude: 23.8, longitude: 90.4 });

        expect(mockPrisma.attendance.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: 'PRESENT' }) })
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('rejects a clock-out when there is no open session', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/attendance/time-out')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4 });

      expect(res.status).toBe(400);
      expect(mockPrisma.attendance.update).not.toHaveBeenCalled();
    });

    it('closes the currently open session on clock-out, not some other row', async () => {
      const openSession = { id: 'open-1', timeIn: new Date(), timeOut: null, status: 'PRESENT' };
      mockPrisma.attendance.findFirst.mockResolvedValue(openSession);
      mockPrisma.attendance.update.mockResolvedValue({ ...openSession, timeOut: new Date() });

      const res = await request(app)
        .post('/attendance/time-out')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4 });

      expect(res.status).toBe(200);
      expect(mockPrisma.attendance.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'open-1' } })
      );
    });
  });

  describe('device binding on POST /attendance/time-in', () => {
    it('allows a clock-in with no device bound yet, regardless of deviceId sent', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: null });

      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4, deviceId: 'device-a' });

      expect(res.status).toBe(201);
    });

    it('allows a clock-in from the bound device', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });

      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4, deviceId: 'device-a' });

      expect(res.status).toBe(201);
    });

    it('rejects a clock-in from a different device than the one bound at login', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });

      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4, deviceId: 'device-b' });

      expect(res.status).toBe(403);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('rejects a clock-in with no deviceId at all when a device is already bound', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });

      const res = await request(app)
        .post('/attendance/time-in')
        .set('Authorization', `Bearer ${makeToken('EMPLOYEE')}`)
        .send({ latitude: 23.8, longitude: 90.4 });

      expect(res.status).toBe(403);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });
  });
});
