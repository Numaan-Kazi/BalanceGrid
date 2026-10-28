import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
    log: config.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  });

if (config.nodeEnv !== 'production') {
  global.__prismaClient = prisma;
}

