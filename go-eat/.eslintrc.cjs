/**
 * Root ESLint config.
 *
 * The custom design-system rules (no-raw-hex, no-primitive-reference) are registered by the
 * `goeat` plugin from packages/design-tokens/eslint-rules — see the overrides below. They are
 * errors, not warnings: Constitution VI.1 makes a raw hex literal in component code a build
 * failure, and a component referencing a primitive directly a review rejection.
 */
module.exports = {
  root: true,
  env: { es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'goeat'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.expo/',
    'ios/',
    'android/',
    '**/generated/**',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    eqeqeq: ['error', 'always'],
    'no-console': 'off',
  },
  overrides: [
    {
      // Principle IV: unseeded randomness in selection is prohibited outright.
      files: ['packages/selection-core/**/*.ts'],
      rules: {
        'no-restricted-properties': [
          'error',
          {
            object: 'Math',
            property: 'random',
            message:
              'Math.random is prohibited in selection-core (Constitution IV). Use the seeded PRNG in src/rng.ts.',
          },
        ],
      },
    },
    {
      // Constitution VI.1: all color resolves to a semantic token. Hex literals and direct
      // primitive references are build failures everywhere that renders.
      files: ['apps/mobile/**/*.{ts,tsx}'],
      rules: {
        'goeat/no-raw-hex': 'error',
        'goeat/no-primitive-reference': 'error',
      },
    },
    {
      // primitives.ts is the single sanctioned home for hex (VI.1). The generators emit hex by
      // definition, and the semantic map records the ratios it was verified against.
      files: [
        'packages/design-tokens/src/primitives.ts',
        'packages/design-tokens/src/semantics.ts',
        'packages/design-tokens/generators/**/*.ts',
        'packages/design-tokens/__tests__/**/*.ts',
      ],
      rules: {
        'goeat/no-raw-hex': 'off',
        'goeat/no-primitive-reference': 'off',
      },
    },
    {
      files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.test.tsx'],
      env: { jest: true },
    },
  ],
};
