const {
  CollectionNames: {
    logs: logsCollectionName,
  },
} = require('./config');

const appRole = 'app';

const setupIndexes = db => db.collection(logsCollectionName).createIndex({
  type: 1,
  runId: 1,
  date: 1,
});
// Currently the only setup is just the indexes.
const setup = setupIndexes;

const createAdminUser = (db, { user, password }) => db.addUser(user, password, {
  roles: ['dbOwner'],
});

const createAppUser = async (db, { user, password, dbName }) => {
  try {
    await db.command({
      createRole: appRole,
      privileges: [
        {
          resource: { db: dbName, collection: logsCollectionName },
          // Updating logs is not possible. Logs should not be modified once
          // added.
          actions: ['insert'],
        },
      ],
      roles: [{ role: 'read', db: dbName }],
    });
  } catch (e) {
    if (e.codeName !== 'DuplicateKey') throw e;
  }
  return db.addUser(user, password, { roles: [appRole] });
};

const createReaderUser = (db, { user, password }) => db.addUser(
  user,
  password,
  { roles: ['read'] },
);

module.exports = { setupIndexes, setup };

if (require.main === module) {
  /* eslint-disable global-require */
  const log = require('loglevel');
  const { MongoClient } = require('mongodb');
  const {
    dbAdminUrl,
    dbNonLoggedURL,
    dbName,
    adminUser,
    adminPassword,
    readerUser,
    readerPassword,
    appUser,
    appPassword,
  } = require('./config');

  const {
    createAdminUser: shouldCreateAdminUser,
    createReaderUser: shouldCreateReaderUser,
    createAppUser: shouldCreateAppUser,
    createAllUsers: shouldCreateAllUsers,
    createCollections: shouldCreateCollections,
  } = require('yargs-parser')(process.argv.slice(2));

  if (
    !(
      shouldCreateAdminUser
      || shouldCreateReaderUser
      || shouldCreateCollections
      || shouldCreateAppUser
      || shouldCreateAllUsers
    )
  ) {
    log.error('Nothing to do');
    log.error('Please provide at least one of these arguments:');
    log.error('\t--create-collections');
    log.error('\t--create-admin-user');
    log.error('\t--create-reader-user');
    log.error('\t--create-app-user');
    log.error('\t--create-all-users');
    process.exit(1);
  }

  MongoClient.connect(
    shouldCreateAdminUser || shouldCreateAllUsers ? dbNonLoggedURL : dbAdminUrl,
    {
      useNewUrlParser: true,
    },
  )
    .then(client => {
      const db = client.db(dbName);
      const promises = [];

      if (shouldCreateAdminUser || shouldCreateAllUsers) {
        promises.push(
          createAdminUser(db, {
            user: adminUser,
            password: adminPassword,
            dbName,
          }),
        );
      }
      if (shouldCreateReaderUser || shouldCreateAllUsers) {
        promises.push(
          createReaderUser(db, {
            user: readerUser,
            password: readerPassword,
            dbName,
          }),
        );
      }
      if (shouldCreateAppUser || shouldCreateAllUsers) {
        promises.push(
          createAppUser(db, {
            user: appUser,
            password: appPassword,
            dbName,
          }),
        );
      }
      if (shouldCreateCollections) {
        promises.push(setup(db));
      }
      return Promise.all(promises).finally(() => client.close());
    })
    .catch(error => {
      log.error(error);
      process.exit(1);
    });
}
