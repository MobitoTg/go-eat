/**
 * Node-only Jest. No simulator, no network, no provider key — Tier 1/Tier 2 of the research R9
 * testing strategy. ts-jest compiles to CommonJS for the test run only; the shipped build stays
 * ESM per tsconfig.base.json.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Source uses ESM-correct `./foo.js` specifiers. Under the CommonJS test compile those
    // resolve to nothing, so strip the extension back off for Jest only.
    '^(\.{1,2}/.*)\.js$': '$1',
    // Workspace packages resolve to their TypeScript sources rather than a build output, so the
    // test run never depends on a prior `tsc`.
    '^@go-eat/([^/]+)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
  transform: {
    '^.+\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          verbatimModuleSyntax: false,
          isolatedModules: false,
        },
      },
    ],
  },
  clearMocks: true,
  restoreMocks: true,
};
