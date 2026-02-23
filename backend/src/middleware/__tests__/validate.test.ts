import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { z } from 'zod';
import { validate, validateQuery } from '../validate.js';

const testSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

function mockReqRes(body = {}, query = {}) {
  const req = { body, query } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  it('calls next for valid body', () => {
    const { req, res, next } = mockReqRes({ email: 'test@test.com', name: 'John' });
    validate(testSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    // Body should be parsed (Zod strip extra fields)
    expect(req.body.email).toBe('test@test.com');
  });

  it('returns 400 for invalid body', () => {
    const { req, res, next } = mockReqRes({ email: 'bad', name: 'J' });
    validate(testSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ]),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for missing required fields', () => {
    const { req, res, next } = mockReqRes({});
    validate(testSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateQuery middleware', () => {
  const querySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  });

  it('calls next for valid query', () => {
    const { req, res, next } = mockReqRes({}, { page: '1', limit: '10' });
    validateQuery(querySchema)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 for invalid query', () => {
    const strictSchema = z.object({ page: z.coerce.number().min(1) });
    const { req, res, next } = mockReqRes({}, { page: '-5' });
    validateQuery(strictSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid query parameters' })
    );
  });
});
