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
]);
