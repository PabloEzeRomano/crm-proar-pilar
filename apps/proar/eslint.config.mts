import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'web-build/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  // React 17+ automatic JSX runtime: no need to import React in scope.
  pluginReact.configs.flat['jsx-runtime'],
  {
    // Explicit version avoids eslint-plugin-react's version auto-detection,
    // which crashes on ESLint 10 (uses the removed context.getFilename API).
    settings: { react: { version: '19.2' } },
  },
  {
    // CommonJS config files (metro.config.js, etc.) legitimately use require().
    files: ['**/*.{js,cjs}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    rules: {
      // Allow underscore-prefixed names for intentionally-unused bindings
      // (e.g. destructuring to omit a key, unused callback args).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // E2E specs use scaffolding locators/fixtures that aren't always asserted.
    // Placed last so it wins over the global no-unused-vars rule above.
    files: ['e2e/**'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
]);
