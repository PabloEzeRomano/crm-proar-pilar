const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the entire monorepo for changes in workspace packages
config.watchFolders = [monorepoRoot];

// Monorepo: resolve node_modules from both the app and the root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

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
