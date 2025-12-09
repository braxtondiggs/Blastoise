import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { randomUUID } from 'crypto';

// Mock Capacitor plugins used in shared components/services
jest.mock('@capacitor/core', () => {
  class WebPlugin {}

  return {
    Capacitor: {
      getPlatform: () => 'web',
      isNativePlatform: () => false,
    },
    registerPlugin: () => ({
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      requestPermissions: jest.fn(),
      checkPermissions: jest.fn(),
      schedule: jest.fn(),
      cancel: jest.fn(),
      getPending: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    }),
    WebPlugin,
  };
});

jest.mock('@capacitor/preferences', () => {
  const mockPreferences = {
    get: jest.fn().mockResolvedValue({ value: null }),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  return { Preferences: mockPreferences };
});

jest.mock('@capacitor/local-notifications', () => {
  const mockLocalNotifications = {
    requestPermissions: jest.fn().mockResolvedValue({ display: 'granted' }),
    checkPermissions: jest.fn().mockResolvedValue({ display: 'granted' }),
    schedule: jest.fn().mockResolvedValue({}),
    cancel: jest.fn().mockResolvedValue({}),
    pending: jest.fn().mockResolvedValue({ notifications: [] }),
    getPending: jest.fn().mockResolvedValue({ notifications: [] }),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  return { LocalNotifications: mockLocalNotifications };
});

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
