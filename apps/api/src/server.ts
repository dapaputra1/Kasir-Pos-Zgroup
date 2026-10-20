import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';

const startServer = async () => {
  try {
    // Validate database connection
    await prisma.$connect();
    console.log('✓ Database connection established successfully.');

    app.listen(config.port, () => {
      console.log(`✓ GrosirPOS API server running on http://localhost:${config.port}`);
      console.log(`  Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
