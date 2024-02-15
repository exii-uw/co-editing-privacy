const log = require('loglevel');
const { dbAppUrl: dbUrl, dbName, port } = require('./config');
const Server = require('./Server');

log.setDefaultLevel(log.levels.INFO);

const mode = process.env.NODE_ENV;

if (require.main === module) {
  const server = Server(port, dbUrl, dbName, mode);

  const start = async () => {
    try {
      await server.start();
      log.info(
        `Server listening on port ${port}${
          mode === 'development' ? ' (dev mode)' : ''
        }`,
      );
    } catch (e) {
      log.error(e);
      process.exit(1);
    }
  };

  const shutdown = message => async () => {
    log.info(`${message} signal received.`);
    log.info('Closing server...');
    try {
      await server.stop();
      log.info('Server closed.');
      process.exit(0);
    } catch (e) {
      log.error(e);
      process.exit(1);
    }
  };

  process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'));

  start();
}
