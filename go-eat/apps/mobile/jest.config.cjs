/**
 * App-level Jest. Covers the pure client logic — cursor, invalidation, payload writing, and the
 * constitutional guard tests. Simulator-dependent integration flows are Tier 3 (Maestro/Detox)
 * and are not run here.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/__tests__/integration/'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
    '^@go-eat/design-tokens/tokens$': '<rootDir>/../../packages/design-tokens/src/tokens.ts',
    '^@go-eat/([^/]+)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
  transform: {
    '^.+\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          jsx: 'react-jsx',
          verbatimModuleSyntax: false,
          isolatedModules: false,
        },
      },
    ],
  },
  clearMocks: true,
  restoreMocks: true,
};
