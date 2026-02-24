import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { config } from './config/index.js';
import { prisma } from './config/prisma.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? config.cors.origin : true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/', routes);

// Error handler (must be last)
app.use(errorHandler);

const ADMIN_BOOTSTRAP_FLAG = 'ENABLE_ADMIN_BOOTSTRAP';
const ADMIN_BOOTSTRAP_EMAIL = 'BOOTSTRAP_ADMIN_EMAIL';
const ADMIN_BOOTSTRAP_PASSWORD = 'BOOTSTRAP_ADMIN_PASSWORD';

// Seed bootstrap admin user (idempotent)
async function seedAdmin() {
  if (config.nodeEnv !== 'development') {
    return;
  }

  if (process.env[ADMIN_BOOTSTRAP_FLAG] !== 'true') {
    console.log(`Admin bootstrap is disabled. Set ${ADMIN_BOOTSTRAP_FLAG}=true to enable in development.`);
    return;
  }

  const bootstrapEmail = process.env[ADMIN_BOOTSTRAP_EMAIL]?.trim();
  const bootstrapPassword = process.env[ADMIN_BOOTSTRAP_PASSWORD];

  if (!bootstrapEmail || !bootstrapPassword) {
    console.warn(
      `Admin bootstrap skipped: ${ADMIN_BOOTSTRAP_EMAIL} and ${ADMIN_BOOTSTRAP_PASSWORD} are required when ${ADMIN_BOOTSTRAP_FLAG}=true.`
    );
    return;
  }

  try {
    const existing = await prisma.employee.findUnique({ where: { email: bootstrapEmail } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
      await prisma.employee.create({
        data: {
          employeeCode: 'ADM001',
          name: 'Admin User',
          email: bootstrapEmail,
          passwordHash,
          role: 'ADMIN',
          department: 'Management',
          designation: 'System Administrator',
        },
      });
      console.log(`Bootstrap admin created for ${bootstrapEmail}.`);
    }
  } catch (e) {
    console.warn('Admin bootstrap skipped:', (e as Error).message);
  }
}

// On Vercel (serverless) the platform handles the HTTP server — just export the app.
// Locally, start the server normally.
if (!process.env.VERCEL) {
  seedAdmin().then(() => {
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  });
} else {
  // Runtime bootstrap seeding is disabled in serverless environments.
}

export default app;
