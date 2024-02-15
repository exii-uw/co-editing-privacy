/* eslint-disable */

module.exports = {
  plugins: [
    require('postcss-smart-import')({
      /* ...options */
    }),
    require('autoprefixer')({
      /* ...options */
    }),
    require('cssnano')({
      preset: 'default'
    })
  ]
};
