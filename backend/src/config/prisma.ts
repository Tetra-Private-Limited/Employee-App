import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export { prisma };
