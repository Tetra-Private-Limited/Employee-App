import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  hashRefreshToken,
} from '../auth.service.js';

const testPayload = { id: 'user-1', email: 'test@example.com', role: 'ADMIN' };

describe('JWT token generation and verification', () => {
  it('generates and verifies access token', () => {
    const token = generateAccessToken(testPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(testPayload.id);
    expect(decoded.email).toBe(testPayload.email);
    expect(decoded.role).toBe(testPayload.role);
  });

  it('generates and verifies refresh token', () => {
    const token = generateRefreshToken(testPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(testPayload.id);
    expect(decoded.email).toBe(testPayload.email);
  });

  it('access token verification fails for invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('refresh token verification fails with access secret', () => {
    const accessToken = generateAccessToken(testPayload);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('access token verification fails with refresh secret', () => {
    const refreshToken = generateRefreshToken(testPayload);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

describe('password hashing', () => {
  it('hashes and compares password correctly', async () => {
    const password = 'SecureP@ss123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);

    const match = await comparePassword(password, hash);
    expect(match).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const match = await comparePassword('wrong-password', hash);
    expect(match).toBe(false);
  });

  it('generates different hashes for same password (different salts)', async () => {
    const hash1 = await hashPassword('test');
    const hash2 = await hashPassword('test');
    expect(hash1).not.toBe(hash2);
  });
});

describe('hashRefreshToken', () => {
  it('returns a hex string', () => {
    const hash = hashRefreshToken('some-refresh-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns consistent hash for same input', () => {
    const h1 = hashRefreshToken('token-123');
    const h2 = hashRefreshToken('token-123');
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different inputs', () => {
    const h1 = hashRefreshToken('token-a');
    const h2 = hashRefreshToken('token-b');
    expect(h1).not.toBe(h2);
  });
});
