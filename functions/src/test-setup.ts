// Global test setup
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK for testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-test-project'
  });
}

// Set test timeout
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).jest?.setTimeout?.(30000);

// Global test utilities - suppress console output during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Uncomment to ignore specific log types during tests
  // log: () => {},
  // debug: () => {},
  // info: () => {},
  warn: () => { },
  error: () => { }
};
