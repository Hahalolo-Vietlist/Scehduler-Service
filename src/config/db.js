const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log query events
prisma.$on('query', (e) => {
  logger.debug(`Query: ${e.query}`);
  logger.debug(`Duration: ${e.duration}ms`);
});

// Log error events
prisma.$on('error', (e) => {
  logger.error(`Database error: ${e.message}`);
});

// Log info events
prisma.$on('info', (e) => {
  logger.info(`Database info: ${e.message}`);
});

// Log warn events
prisma.$on('warn', (e) => {
  logger.warn(`Database warning: ${e.message}`);
});

module.exports = prisma;
