const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: Metro resolves zustand's ESM middleware.mjs which contains `import.meta.env`,
// a syntax error in non-module web scripts. Force Metro to use the CJS version
// by removing the `import` condition from ESM resolution.
config.resolver.unstable_conditionNames = [
  'require',
  'default',
  'react-native',
  'browser',
];

module.exports = config;
