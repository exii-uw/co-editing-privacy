import { END_POINTS } from './constants';

class FailedRequestError extends Error {
  constructor(response, data) {
    super(data.message);
    this.response = response;
    this.data = data;
    this.name = 'FailedRequestError';
  }
}

const failingJSONFetch = (...args) => fetch(...args).then(async res => {
  if (res.ok) return res.json();
  throw new FailedRequestError(res, await res.json());
});

const getPostFetchOpts = data => ({
  method: 'POST',
  body: JSON.stringify(data),
  headers: { 'Content-Type': 'application/json' },
});

const Logger = ({ defaults = {}, logEndpoint = END_POINTS.logs } = {}) => {
  const log = ({ date = new Date(), ...data } = {}) => failingJSONFetch(
    logEndpoint,
    getPostFetchOpts({ ...defaults, date, ...data }),
  );
  return { log };
};

export default Logger;
