export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/frontend/', '/node_modules/'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  verbose: true,
  maxWorkers: 1
};