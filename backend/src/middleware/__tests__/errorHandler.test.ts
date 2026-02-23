import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../errorHandler.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

const req = {} as Request;
const next = vi.fn() as NextFunction;

describe('errorHandler middleware', () => {
  it('handles Prisma P2002 (unique constraint) as 409', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['email'] },
    });
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'A record with this value already exists',
      })
    );
  });

  it('handles Prisma P2025 (not found) as 404', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Record not found' })
    );
  });

  it('handles other Prisma known errors as 400', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Some error', {
      code: 'P2003',
      clientVersion: '5.0.0',
    });
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Database error' })
    );
  });

  it('handles Prisma validation errors as 400', () => {
    const err = new Prisma.PrismaClientValidationError('Invalid data', {
      clientVersion: '5.0.0',
    });
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid data provided' })
    );
  });

  it('handles generic errors as 500', () => {
    const err = new Error('Something went wrong');
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
