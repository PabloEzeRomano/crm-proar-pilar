module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Fix: Zustand's devtools middleware uses `import.meta.env` which
      // is a syntax error in Metro's non-module web bundles.
      'babel-plugin-transform-import-meta',
    ],
  };
};
