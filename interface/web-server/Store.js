const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const through = require('through2');
const { pipeline } = require('readable-stream');
const {
  CollectionNames: { logs: logsCollectionName },
} = require('./config');

const defaultIdEncoder = {
  encode: id => ObjectID.createFromHexString(id),
  decode: objectId => objectId.toHexString(),
};

/**
 * @param {Db} db A mongo db database (see
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Db.html).
 * @param {object} options Store options.
 * @param {{ encode, decode }} options.idEncoder The encoder to use to encode
 * and decode log ids from mongodb db ids.
 * @return {{ log }} The store.
 */
const Store = (db, { idEncoder = defaultIdEncoder } = {}) => {
  /**
   * @param {object} logData A token
   * @return {Promise} A promise that resolves when the log is recorded.
   */
  const log = async logData => {
    const { insertedId } = await db
      .collection(logsCollectionName)
      .insertOne(omit(logData, ['_id']));
    return idEncoder.decode(insertedId);
  };

  /**
   * @param {string} logType The type of logs to get.
   * @returns {ReadableStream} A readable stream with the log objects.
   */
  const getLogs = logType => pipeline(
    db
      .collection(logsCollectionName)
      .find({ type: logType })
      .sort({ runId: 1, date: 1 })
      .stream(),
    through.obj(function t(chunk, encoding, callback) {
      // eslint-disable-next-line no-underscore-dangle
      this.push({ ...chunk, _id: idEncoder.decode(chunk._id) });
      callback();
    }),
    () => {},
  );

  return { log, getLogs };
};

module.exports = Store;
