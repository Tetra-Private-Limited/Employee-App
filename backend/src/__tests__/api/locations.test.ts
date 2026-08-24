import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findUnique: vi.fn(),
  },
  locationRecord: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  },
  spoofingAlert: {
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { createTestApp } from '../helpers.js';

const app = createTestApp();

function makeToken(id = 'emp-1') {
  return jwt.sign({ id, email: 'test@example.com', role: 'EMPLOYEE' }, config.jwt.accessSecret, {
    expiresIn: '1h',
  });
}

// New York vs. Los Angeles — ~3900km apart, far enough that a 1-2 hour gap
// between them is well over the 200km/h impossible-travel threshold.
const NY = { latitude: 40.7128, longitude: -74.006 };
const LA = { latitude: 34.0522, longitude: -118.2437 };

function loc(coords: { latitude: number; longitude: number }, recordedAt: string) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: 10,
    speed: 0,
    provider: 'gps',
    isMock: false,
    recordedAt,
  };
}

// Each call to prisma.locationRecord.create in the controller returns
// exactly what it was given (plus an id), so it can double as "the record
// that becomes `previous` for the next iteration" in the mock, the same as
// real Prisma would.
function echoCreate() {
  let n = 0;
  mockPrisma.locationRecord.create.mockImplementation(async ({ data }: any) => ({
    id: `rec-${++n}`,
    ...data,
  }));
}

describe('POST /locations/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.locationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: null });
    echoCreate();
  });

  it('does not flag a late-arriving backlog as impossible travel against a newer already-synced point', async () => {
    // The device's periodic sync worker retries with backoff, so an older
    // batch can arrive AFTER a more recent point has already been synced
    // (e.g. a quick sync succeeded, then a delayed retry of an earlier
    // failed attempt delivers older backlog). Here, NY-at-`now` is already
    // the newest row in the table when this request's older LA backlog
    // (from 1-2 hours before `now`) comes in.
    const now = new Date('2026-01-15T12:00:00.000Z');

    mockPrisma.locationRecord.findFirst.mockResolvedValue({
      id: 'prev-0',
      ...NY,
      accuracy: 10,
      speed: 0,
      provider: 'gps',
      isMock: false,
      satelliteCount: null,
      snrAverage: null,
      accelerometerX: null,
      accelerometerY: null,
      accelerometerZ: null,
      recordedAt: now,
    });

    const twoHoursBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
    const locations = [loc(LA, twoHoursBefore.toISOString()), loc(LA, oneHourBefore.toISOString())];

    const res = await request(app)
      .post('/locations/batch')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ locations, deviceId: 'device-1' });

    expect(res.status).toBe(201);
    expect(res.body.data.synced).toBe(2);

    const alertTypes = mockPrisma.spoofingAlert.createMany.mock.calls.flatMap((call) =>
      call[0].data.map((a: any) => a.alertType)
    );
    expect(alertTypes).not.toContain('IMPOSSIBLE_TRAVEL');
  });

  it('still detects genuine impossible travel between two points in the same batch', async () => {
    const t0 = new Date('2026-01-15T12:00:00.000Z');
    const oneMinuteLater = new Date(t0.getTime() + 60 * 1000);

    const locations = [loc(NY, t0.toISOString()), loc(LA, oneMinuteLater.toISOString())];

    const res = await request(app)
      .post('/locations/batch')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ locations, deviceId: 'device-1' });

    expect(res.status).toBe(201);

    const alertTypes = mockPrisma.spoofingAlert.createMany.mock.calls.flatMap((call) =>
      call[0].data.map((a: any) => a.alertType)
    );
    expect(alertTypes).toContain('IMPOSSIBLE_TRAVEL');
  });

  it('processes an out-of-order batch in chronological order', async () => {
    const t0 = new Date('2026-01-15T12:00:00.000Z');
    const t1 = new Date(t0.getTime() + 60 * 60 * 1000);
    const t2 = new Date(t0.getTime() + 2 * 60 * 60 * 1000);

    // Sent out of order: t2, t0, t1.
    const locations = [loc(NY, t2.toISOString()), loc(NY, t0.toISOString()), loc(NY, t1.toISOString())];

    const res = await request(app)
      .post('/locations/batch')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ locations, deviceId: 'device-1' });

    expect(res.status).toBe(201);

    const createdOrder = mockPrisma.locationRecord.create.mock.calls.map(
      (call) => call[0].data.recordedAt.getTime()
    );
    expect(createdOrder).toEqual([t0.getTime(), t1.getTime(), t2.getTime()]);
  });

  describe('device binding', () => {
    it('rejects a batch from a different device than the one bound at login', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });

      const res = await request(app)
        .post('/locations/batch')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ locations: [loc(NY, new Date().toISOString())], deviceId: 'device-b' });

      expect(res.status).toBe(403);
      expect(mockPrisma.locationRecord.create).not.toHaveBeenCalled();
    });

    it('allows a batch from the bound device', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });

      const res = await request(app)
        .post('/locations/batch')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ locations: [loc(NY, new Date().toISOString())], deviceId: 'device-a' });

      expect(res.status).toBe(201);
    });
  });
});

describe('GET /locations/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.locationRecord.findMany.mockResolvedValue([]);
  });

  it('looks back 24 hours, not a short live-only window, so a clocked-out employee stays visible', async () => {
    const before = Date.now();

    const res = await request(app)
      .get('/locations/recent')
      .set('Authorization', `Bearer ${jwt.sign({ id: 'admin-1', email: 'a@test.com', role: 'ADMIN' }, config.jwt.accessSecret, { expiresIn: '1h' })}`);

    const after = Date.now();

    expect(res.status).toBe(200);
    const call = mockPrisma.locationRecord.findMany.mock.calls[0][0];
    const windowStart: Date = call.where.recordedAt.gte;

    // Should be ~24h ago, not ~10 minutes ago — allow a little slack for
    // test execution time.
    const ageMs = before - windowStart.getTime();
    expect(ageMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(ageMs).toBeLessThan(24.1 * 60 * 60 * 1000);
    expect(after - before).toBeLessThan(60 * 1000); // sanity: test itself ran fast
  });
});
