// Set required env vars for tests before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-for-vitest';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-vitest';
process.env.NODE_ENV = 'test';
