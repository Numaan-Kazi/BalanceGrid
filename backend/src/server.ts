import { createApp } from './app';
import { config } from './config/env';
import { prisma } from './db/prisma';

const app = createApp();

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✓ Successfully connected to PostgreSQL via Prisma');

    const server = app.listen(config.port, () => {
      console.log(`✓ Personal Finance Tracker API running on http://localhost:${config.port}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ CORS enabled for: ${config.frontendUrl}`);
      if (!config.google.clientId || !config.google.clientSecret) {
        console.warn('! Notice: Google OAuth credentials not yet configured in backend/.env');
      }
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✓ Database disconnected. Process terminated cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();

