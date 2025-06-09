import express from 'express';
import cors from 'cors';
import path from 'path';
import { receiptRoutes } from '../routes/receiptRoutes';
import { errorHandler } from '../middleware/errorHandler';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

  // Routes
  app.use('/api', receiptRoutes);

  // Error handling middleware (should be last)
  app.use(errorHandler);

  return app;
}; 