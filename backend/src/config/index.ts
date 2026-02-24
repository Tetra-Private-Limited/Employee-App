import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function geofencePolicy(): 'WARN' | 'BLOCK' {
  return process.env.GEOFENCE_ENFORCEMENT_POLICY?.toUpperCase() === 'BLOCK' ? 'BLOCK' : 'WARN';
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
  officeHours: {
    start: 9,
    end: 18,
    lateThresholdMinutes: 15,
  },
  geofence: {
    enforcementPolicy: geofencePolicy(),
  },
} as const;
