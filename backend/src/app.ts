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

// Seed default admin user (idempotent)
async function seedAdmin() {
  try {
    const existing = await prisma.employee.findUnique({ where: { email: 'admin@example.com' } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('admin123', 12);
      await prisma.employee.create({
        data: {
          employeeCode: 'ADM001',
          name: 'Admin User',
          email: 'admin@example.com',
          passwordHash,
          role: 'ADMIN',
          department: 'Management',
          designation: 'System Administrator',
        },
      });
      console.log('Default admin created — email: admin@example.com  password: admin123');
    }
  } catch (e) {
    console.warn('Seed skipped:', (e as Error).message);
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
  // Run seed on first cold start (idempotent, safe to call every deploy)
  seedAdmin();
}

export default app;
