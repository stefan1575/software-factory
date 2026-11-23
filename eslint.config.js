import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules/', 'dist/', 'coverage/', 'eslint.config.js'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    // No comment in a file can switch a rule off.
    linterOptions: { noInlineConfig: true },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true }],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test'] }] },
      ],
    },
  },
  {
    // Working out where a project stands, and laying it out as text, touch no network and write nowhere.
    files: ['src/picture.ts', 'src/print.ts'],
    rules: {
      'no-restricted-globals': ['error', 'fetch', 'process', 'console'],
      'no-restricted-imports': ['error', { patterns: ['node:*', './github.ts', './cli.ts', './token.ts'] }],
    },
  },
);
