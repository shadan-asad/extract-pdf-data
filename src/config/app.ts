import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import receiptRoutes from '../routes/receiptRoutes';
import { errorHandler } from '../middleware/errorHandler';
import { swaggerSpec } from './swagger';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PDF Receipt Extraction API Documentation',
  }));

  // Static files
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

  // Routes
  app.use('/api', receiptRoutes);

  // Error handling middleware (should be last)
  app.use(errorHandler);

  return app;
}; 