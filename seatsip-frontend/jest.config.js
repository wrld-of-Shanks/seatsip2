/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testTimeout: 15000,
  clearMocks: true,
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage',
  },
};
