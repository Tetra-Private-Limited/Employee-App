import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { authorize } from '../authorize.js';

function mockReqRes(user?: { id: string; email: string; role: string }) {
  const req = { user } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('authorize middleware', () => {
  it('returns 401 when req.user is not set', () => {
    const { req, res, next } = mockReqRes(undefined);
    authorize('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Authentication required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in allowed roles', () => {
    const { req, res, next } = mockReqRes({ id: 'u1', email: 'e@e.com', role: 'EMPLOYEE' });
    authorize('ADMIN', 'MANAGER')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Insufficient permissions' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user role matches', () => {
    const { req, res, next } = mockReqRes({ id: 'u1', email: 'e@e.com', role: 'ADMIN' });
    authorize('ADMIN', 'MANAGER')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('works with multiple allowed roles', () => {
    const { req, res, next } = mockReqRes({ id: 'u1', email: 'e@e.com', role: 'MANAGER' });
    authorize('ADMIN', 'MANAGER')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
