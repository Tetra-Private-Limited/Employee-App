import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  // IANA timezone name (e.g. "Asia/Dhaka") the organization operates in.
  // Attendance day boundaries and the late-arrival check are computed in
  // this timezone, not the server process's own local time — deploying to
  // a UTC host (e.g. Vercel) shouldn't shift when "today" starts for a team
  // elsewhere.
  timezone: process.env.ORG_TIMEZONE || 'UTC',
  officeHours: {
    start: 9,
    end: 18,
    lateThresholdMinutes: 15,
  },
} as const;
