import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import markdown from '@eslint/markdown';
import playwright from 'eslint-plugin-playwright';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'blob-report/',
      /* ESLint does not read .gitignore - list those files here as well */
      '.playwright-cli/',
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
  },

  /* type-aware linting - `no-floating-promises` checks for missing `await`s
   * on Playwright assertions */
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  /* Playwright-specific rules: missing awaits on expects, conditional expects,
   * stray `.only`, forbidden `waitForTimeout`, etc. */
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.spec.ts'],
  },

  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    extends: ['markdown/recommended'],
    rules: {
      'markdown/heading-increment': 'off',
    },
  },

  /* any embedded code in Markdown shouldn't fail the type-aware rules */
  {
    files: ['**/*.md', '**/*.md/**'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  /* must stay last: turns off stylistic rules that would fight Prettier */
  eslintConfigPrettier,
]);
