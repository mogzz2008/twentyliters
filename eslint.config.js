import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'docs/**', 'video-src/**'] },
  js.configs.recommended,
  { files: ['public/**/*.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } } },
  { files: ['public/js/core/**/*.js'], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } } },
  { files: ['scripts/qa-browser.mjs', 'scripts/screens.mjs', 'video-src/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-shadow': 'error',
      curly: ['error', 'multi-line'],
    },
  },
];
