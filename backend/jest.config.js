export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': '@swc/jest',
  },
  moduleFileExtensions: ['js'],
  testMatch: ['**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  maxWorkers: 1, // Run tests serially to avoid Prisma connection conflicts
};
