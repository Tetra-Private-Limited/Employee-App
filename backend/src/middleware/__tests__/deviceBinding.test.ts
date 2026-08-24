import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mockPrisma = vi.hoisted(() => ({
  employee: { findUnique: vi.fn() },
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { verifyDeviceBinding } from '../deviceBinding.js';

function mockReqRes(body: Record<string, unknown> = {}) {
  const req = { user: { id: 'u1', email: 'e@e.com', role: 'EMPLOYEE' }, body } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('verifyDeviceBinding middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next when the employee has no device bound yet', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: null });
    const { req, res, next } = mockReqRes({ deviceId: 'any-device' });

    await verifyDeviceBinding(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when the request device matches the bound device', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });
    const { req, res, next } = mockReqRes({ deviceId: 'device-a' });

    await verifyDeviceBinding(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the request device does not match the bound device', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });
    const { req, res, next } = mockReqRes({ deviceId: 'device-b' });

    await verifyDeviceBinding(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when a device is bound but the request has no deviceId', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ registeredDeviceId: 'device-a' });
    const { req, res, next } = mockReqRes({});

    await verifyDeviceBinding(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards unexpected errors to next', async () => {
    mockPrisma.employee.findUnique.mockRejectedValue(new Error('db down'));
    const { req, res, next } = mockReqRes({ deviceId: 'device-a' });

    await verifyDeviceBinding(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
