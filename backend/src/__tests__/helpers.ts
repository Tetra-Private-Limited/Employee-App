import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';

/**
 * Creates a fresh Express app for integration testing (without calling app.listen).
 */
export function createTestApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/', routes);
  app.use(errorHandler);
  return app;
}
