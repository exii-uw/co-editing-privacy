const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const resolve = relPath => path.resolve(__dirname, relPath);

const pages = [
//  { id: 'driverTest', title: 'Side Touch Input' },
//  { id: 'debug', title: 'Side Touch Debug' },
  { id: 'interface', title: 'Interface' },
];

module.exports = {
  entry: pages.reduce(
    (acc, page) => ({ ...acc, [page.id]: [`./${page.id}`] }),
    {},
  ),
  output: {
    path: resolve('dist'),
  },
  context: resolve('src'),
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.m?js$/,
        exclude: /\bcore-js\b/,
        use: 'babel-loader',
      },
      {
        test: /\.(png|jpg|etc)$/,
        use: [{
          loader: "file-loader", // or url-loader
          options: {
            name: '[name].[ext]',
            outputPath: 'assets/images/',
            esModule: false,
          }
        }],
      },
      {
        test:/\.html$/,
        use: [
          'html-loader'
        ]
      },
    ],
  },
  plugins: [
    new CopyPlugin([{ from: 'index.html', to: 'index.html' }]),
    new MiniCssExtractPlugin(),
    ...pages.map(page => {
      const options = {
        filename: `${page.id}.html`,
        chunks: [page.id],
      };
      if (page.template != null) {
        options.template = page.template;
      }
      if (page.title != null) {
        options.title = page.title;
      }
      const templatePath = resolve(`src/${page.id}/index.ejs`);
      if (fs.existsSync(templatePath)) {
        options.template = templatePath;
      }
      return new HtmlWebpackPlugin(options);
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
