import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import monthlyRoutes from './routes/monthly';
import expenseRoutes from './routes/expenses';
import incomeRoutes from './routes/incomes';
import transferRoutes from './routes/transfers';
import categoryRoutes from './routes/categories';
import goalRoutes from './routes/goals';
import bucketListRoutes from './routes/bucketList';
import recurringBillRoutes from './routes/recurringBills';
import reportRoutes from './routes/reports';

export const createApp = (): Application => {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Handled by frontend bundler / proxy
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Request body and cookie parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Logging
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/monthly', monthlyRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/incomes', incomeRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/bucket-plans', bucketListRoutes);
  app.use('/api/recurring-bills', recurringBillRoutes);
  app.use('/api/reports', reportRoutes);

  // 404 handler for undefined API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.baseUrl}` });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};

