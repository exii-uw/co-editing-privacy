const Koa = require('koa');
const respond = require('koa-respond');
const Logger = require('koa-logger');
const { MongoClient } = require('mongodb');
const simpleGit = require('simple-git');
const path = require('path');
const { promisify } = require('util');
const Store = require('./Store');
const ClientMiddleware = require('./middlewares/client-midleware.js');
const APIMiddleWare = require('./api');
const errorHandler = require('./middlewares/error-handler');
const { version } = require('../package.json');
const { apiEndPoint } = require('./config');

const git = simpleGit(path.join(__dirname, '..'));
const getGitLog = promisify(git.log.bind(git));
const getGitStatus = promisify(git.status.bind(git));

const App = ({
  version: appVersion,
  versionStatus,
  clientMiddleware,
  apiMiddleWare,
}) => {
  const app = new Koa();

  if (process.env.NODE_ENV === 'development') {
    app.use(Logger());
  }
  // Enable support for X-Forwarded-For headers.
  app.proxy = true;

  // Deal with unhandled requests and errors.
  app.use(respond());
  app.use(errorHandler());

  // Mount the api.
  app.use(apiMiddleWare.routes()).use(apiMiddleWare.allowedMethods());

  // Serve the web page.
  app.use(clientMiddleware);

  // Set up app version (for logging purposes).
  app.version = appVersion;
  app.versionStatus = versionStatus;

  return app;
};

App.create = async (store, mode) => {
  // Create the middlewares.
  const apiMiddleWare = APIMiddleWare(`/${apiEndPoint}`, store);
  const clientMiddleware = await ClientMiddleware.create({ mode });

  // Fetch the git status.
  const gitLog = await getGitLog({ '--max-count': '1' });
  const gitStatus = await getGitStatus();
  const versionStatus = {
    hash: gitLog.latest.hash,
    deletedFiles: gitStatus.deleted.length,
    modifiedFiles: gitStatus.modified.length,
    createdFiles: gitStatus.created.length,
    notVersionedFiles: gitStatus.not_added.length,
    renamedFiles: gitStatus.renamed.length,
  };

  return App({
    version,
    versionStatus,
    clientMiddleware,
    apiMiddleWare,
  });
};

const Server = (
  port,
  dbUrl,
  dbName,
  mode,
  mongoConfig = { useNewUrlParser: true, poolSize: 10 },
) => {
  let startupPromise = null;

  const doStart = async () => {
    const dbClient = await MongoClient.connect(dbUrl, mongoConfig);
    const store = Store(dbClient.db(dbName));
    const app = await App.create(store, mode);
    const server = app.listen(port);
    return { store, server, dbClient };
  };

  const start = () => {
    if (startupPromise) {
      throw new Error('Server already started');
    }
    startupPromise = doStart();
    return startupPromise;
  };

  const stop = async () => {
    // Make sure everything is properly created before starting to close them.
    if (!startupPromise) return;
    const { dbClient, server } = await startupPromise;
    // Close everything.
    await dbClient.close();
    await server.close();
    // Clean up.
    startupPromise = null;
  };

  return { start, stop };
};

module.exports = Server;
