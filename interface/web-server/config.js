const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const {
  adminUser,
  adminPassword,
  readerUser,
  readerPassword,
  appUser,
  appPassword,
  host: dbHost,
  port: dbPort,
  db,
} = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../db-config.yaml')));

const dbBaseUrl = `${dbHost}:${dbPort}/${db}`;

const dbAdminUrl = `mongodb://${adminUser}:${adminPassword}@${dbBaseUrl}`;
const dbReaderUrl = `mongodb://${readerUser}:${readerPassword}@${dbBaseUrl}`;
const dbAppUrl = `mongodb://${appUser}:${appPassword}@${dbBaseUrl}`;
const dbNonLoggedURL = `mongodb://${dbBaseUrl}`;

const staticFilePath = path.join(__dirname, '../dist');

const assetsFilePath = path.join(__dirname, '../assets');

const port = 9000;

const CollectionNames = {
  logs: 'logs',
};

const apiEndPoint = 'api';

module.exports = {
  adminUser,
  adminPassword,
  appUser,
  appPassword,
  readerUser,
  readerPassword,
  dbAdminUrl,
  dbReaderUrl,
  dbAppUrl,
  dbNonLoggedURL,
  dbName: db,
  staticFilePath,
  assetsFilePath,
  port,
  CollectionNames,
  apiEndPoint,
};
