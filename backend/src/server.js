const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const jobs = require('./jobs');

let server;

async function start() {
  await connectDatabase();

  server = app.listen(env.port, () => {
    logger.info(`ULMS API listening on http://localhost:${env.port}${env.apiPrefix}`);
    logger.info(`API documentation at http://localhost:${env.port}/api-docs`);
  });

  if (env.jobs.enabled) jobs.start();
}

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  jobs.stop();
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason?.stack || reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});

start().catch((err) => {
  logger.error(`Failed to start server: ${err.stack || err.message}`);
  process.exit(1);
});
