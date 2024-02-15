module.exports = api => {
  // const isForProd = api.env('production');
  api.cache.forever();

  const presets = [
    [
      '@babel/preset-env',
      {
        targets: { browsers: '>1%' },
        useBuiltIns: 'usage',
        modules: false,
        loose: true,
      },
    ],
  ];

  return {
    presets,
    sourceType: 'unambiguous',
    ignore: [/\/core-js/],
  };
};
