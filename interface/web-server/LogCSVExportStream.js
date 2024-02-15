const { PassThrough, pipeline, finished } = require('readable-stream');
const CSVStringifier = require('csv-stringify');

const LogCSVExportStream = (store, logType) => {
  // Store the csv columns.
  const columns = new Set();

  // Create the result stream.
  const result = new PassThrough();

  // Pipe all logs to the result stream. Needs to be called once the columns
  // have been setup.
  const pipeLogs = () => {
    pipeline(
      store.getLogs(logType),
      CSVStringifier({
        columns: [...columns],
        header: true,
        cast: {
          date: d => d.toISOString(),
          boolean: b => (b ? 'true' : 'false'),
        },
      }),
      result,
      () => {},
    );
  };

  // Go through all logs once to find out what columns need to be in the CSV.
  const logStream = store.getLogs(logType);
  logStream.on('data', d => {
    Object.keys(d).forEach(c => {
      columns.add(c);
    });
  });
  finished(logStream, err => {
    if (err == null) {
      pipeLogs();
    } else {
      result.destroy(err);
    }
  });

  return result;
};

module.exports = LogCSVExportStream;
