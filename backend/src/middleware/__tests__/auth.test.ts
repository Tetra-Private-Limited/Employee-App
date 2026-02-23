import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../auth.js';
import { config } from '../../config/index.js';

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('returns 401 when no Authorization header', () => {
    const { req, res, next } = mockReqRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Access token required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header missing Bearer prefix', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Token abc' });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next for valid token', () => {
    const payload = { id: 'u1', email: 'test@test.com', role: 'ADMIN' };
    const token = jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '1h' });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('u1');
    expect(req.user!.email).toBe('test@test.com');
    expect(req.user!.role).toBe('ADMIN');
  });

  it('returns 401 with TOKEN_EXPIRED for expired token', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'test@test.com', role: 'ADMIN' },
      config.jwt.accessSecret,
      { expiresIn: '0s' }
    );
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Access token expired', code: 'TOKEN_EXPIRED' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer invalid.jwt.token' });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid access token' })
    );
    expect(next).not.toHaveBeenCalled();
  });


  it('returns 401 when token payload is missing required claims', () => {
    const token = jwt.sign({ id: 'u1' }, config.jwt.accessSecret, { expiresIn: '1h' });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid access token' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for token signed with wrong secret', () => {
    const token = jwt.sign({ id: 'u1' }, 'wrong-secret');
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
