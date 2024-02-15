const serve = require('koa-static');
const webpack = require('webpack');
const koaWebpack = require('koa-webpack');
const webpackConfig = require('../../webpack.dev.js');
const { staticFilePath } = require('../config');

const ClientMiddleWare = () => {
  throw new Error(
    'Cannot instantiate ClientMiddleWare directly. Use ClientMiddleWare.create()',
  );
};

ClientMiddleWare.create = async ({ mode }) => {
  if (mode === 'development') {
    const compiler = webpack(await webpackConfig);
    return koaWebpack({ compiler });
  }
  return serve(staticFilePath);
};

module.exports = ClientMiddleWare;
