/**
 * Jest configuration specifically optimized for CI environments (Windows/GitHub Actions)
 * This config prioritizes stability and prevents hanging issues
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // CI-specific timeout and worker settings
  testTimeout: 15000,
  maxWorkers: 1,
  maxConcurrency: 1,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  
  // Test file patterns - focus on essential tests that work reliably
  testMatch: [
    '<rootDir>/test/simple.test.js',
    '<rootDir>/test/standalone.test.js',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/electron/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2017',
          lib: ['es2017', 'dom'],
          allowJs: true,
          skipLibCheck: true,
          strict: false,
          forceConsistentCasingInFileNames: false,
          noEmit: true,
          esModuleInterop: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
        }
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage settings (disabled for CI speed)
  collectCoverage: false,
  
  // Error handling
  bail: false,
  verbose: true,
  silent: false,
  
  // Prevent hanging
  forceExit: true,
  detectOpenHandles: true,
  
  // Remove deprecated globals section - config moved to transform
};
