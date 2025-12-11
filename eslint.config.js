import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import { defineConfig, globalIgnores } from 'eslint/config'
import path from 'node:path'

export default defineConfig([
  // Global ignores
  globalIgnores([
    'dist',
    // Ignore generated client models if needed (orval)
    'src/api/models/**',
  ]),

  {
    files: ['**/*.{ts,tsx}'],
    // Base configs
    extends: [
      js.configs.recommended,
      // TypeScript flat configs (includes parser)
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      // Enable type-aware rules where helpful
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: path.resolve(process.cwd()),
      },
    },
    settings: {
      // Resolve path aliases used in Vite/tsconfig
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          moduleDirectory: ['node_modules', 'src'],
        },
      },
    },
    rules: {
      // React hooks best practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Prefer type-only imports to reduce JS output and circular deps noise
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // Avoid false positives from JS core rules in TS context
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',

      // Reliability with async/promise code
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',

      // Optional: keep imports tidy (grouping and order)
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Config files without type-aware parsing
  {
    files: ['vite.config.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },

  {
    files: ['orval.config.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },

  // Test files (Vitest/Jest) – allow test globals
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Vitest globals
        vi: true,
        describe: true,
        it: true,
        test: true,
        expect: true,
        beforeAll: true,
        afterAll: true,
        beforeEach: true,
        afterEach: true,
        // If using Jest instead of Vitest, swap to globals.jest
      },
    },
    rules: {
      // Tests often use underscores or unused vars in parameter lists
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
])