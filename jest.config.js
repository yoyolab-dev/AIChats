export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/frontend/', '/node_modules/'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['<rootDir>/src/server.js'],
  coverageDirectory: 'coverage',
  verbose: true,
  maxWorkers: 1
};