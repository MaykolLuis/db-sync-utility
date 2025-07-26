/**
 * Jest configuration optimized for Windows builds and CI environments
 * This config avoids Next.js integration issues and focuses on core testing
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Timeout and stability settings
  testTimeout: 10000,
  maxWorkers: 1,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/test/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/electron/',
    '<rootDir>/dist/',
  ],
  
  // Transform patterns - simplified for CommonJS compatibility
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    '^.+\.(js|jsx)$': 'babel-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage settings
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // Timeout settings
  testTimeout: 15000,
  
  // Verbose output
  verbose: true,
  
  // Avoid memory issues
  maxWorkers: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Disable ES modules handling for CommonJS compatibility
  extensionsToTreatAsEsm: [],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\.mjs$))',
  ],
};
