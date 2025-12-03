import type { Config } from 'jest';

const config: Config = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '../../coverage/apps/api',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/**/*.dto.ts',
    '!<rootDir>/src/**/dto/*.ts',
    '!<rootDir>/src/**/*.entity.ts',
    '!<rootDir>/src/**/pino.config.ts',
  ],
  coveragePathIgnorePatterns: [
    '/src/migrations/',
    '/src/database/',
  ],
};

export default config;
