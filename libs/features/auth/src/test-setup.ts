import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { randomUUID } from 'crypto';
import { jest } from '@jest/globals';

// Polyfill crypto.randomUUID for jsdom
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {} as Crypto;
}
if (typeof globalThis.crypto.randomUUID === 'undefined') {
  globalThis.crypto.randomUUID = randomUUID;
}

// Suppress CSS parsing errors from ng-icons @layer syntax that jsdom doesn't support
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as { type: string }).type === 'css parsing'
  ) {
    return; // Suppress CSS parsing errors
  }
  originalConsoleError.apply(console, args);
};

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Mock Capacitor native APIs for tests
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn(() => false) },
  registerPlugin: jest.fn(() => ({})),
}));

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: jest.fn(async () => ({ value: null })),
    set: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  },
}));

jest.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: jest.fn(async () => ({ display: 'granted' })),
    checkPermissions: jest.fn(async () => ({ display: 'granted' })),
    schedule: jest.fn(async () => ({})),
  },
}));
