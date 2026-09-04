const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterSetup: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/store/(.*)$': '<rootDir>/src/store/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/api/(.*)$': '<rootDir>/src/app/api/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@/server/(.*)$': '<rootDir>/src/server/$1',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/__tests__/**/*.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/layout.tsx',
    '!src/**/page.tsx',
    '!src/**/loading.tsx',
    '!src/**/error.tsx',
    '!src/**/not-found.tsx',
    '!src/app/globals.css',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'clover'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/cypress/',
    '<rootDir>/e2e/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react-jsx',
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$|@radix-ui|@tanstack|date-fns|zustand|immer|clsx|tailwind-merge|class-variance-authority|recharts|socket.io))',
  ],
  setupFiles: [],
  globalSetup: undefined,
  globalTeardown: undefined,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 2,
  testTimeout: 10000,
}

module.exports = createJestConfig(customJestConfig)
