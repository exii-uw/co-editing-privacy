/* eslint-disable import/prefer-default-export */

const apiEndPoint = `${window.location.origin}/api`;
export const END_POINTS = Object.freeze({
  api: apiEndPoint,
  logs: `${apiEndPoint}/logs`,
});
