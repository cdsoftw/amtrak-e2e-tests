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
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
  },

  /* Type-aware linting. The headline rule is `no-floating-promises`: a missing
   * `await` on a Playwright assertion silently passes, which is the worst
   * failure mode a test suite can have. */
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
      /* Intentional: `######` renders as small muted text on GitHub, which is
       * the right visual weight for a byline or footnote. These docs are flat
       * enough that a strict heading ladder buys nothing. */
      'markdown/heading-increment': 'off',
    },
  },

  /* Markdown and its embedded code blocks are not part of the TS program, so
   * type-aware rules would error trying to resolve them. */
  {
    files: ['**/*.md', '**/*.md/**'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  /* Must stay last: turns off stylistic rules that would fight Prettier. */
  eslintConfigPrettier,
]);
