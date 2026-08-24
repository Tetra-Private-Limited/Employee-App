import rateLimit from 'express-rate-limit';

// Disabled under NODE_ENV=test so the existing integration test suite (which
// makes repeated /auth/login calls against a single shared in-process app)
// isn't throttled by a shared in-memory counter.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: 'Too many login attempts. Please try again later.' },
});
