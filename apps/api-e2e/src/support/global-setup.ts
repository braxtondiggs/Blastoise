import { waitForPortOpen } from '@nx/node/utils';
import axios from 'axios';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

/**
 * Wait for API to be ready by checking a health endpoint
 * Includes retry logic for CI environments
 */
async function waitForApiReady(
  baseUrl: string,
  maxAttempts = 30,
  delayMs = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Try to hit the root endpoint (it's public and should return 200)
      const response = await axios.get(`${baseUrl}/api/v1`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        console.log(`✅ API is ready after ${attempt} attempt(s)`);
        return;
      }
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) {
        console.error(
          `❌ API failed to become ready after ${maxAttempts} attempts`
        );
        throw new Error(
          `API not ready: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Log progress every 5 attempts
      if (attempt % 5 === 0) {
        console.log(
          `⏳ Waiting for API... (attempt ${attempt}/${maxAttempts})`
        );
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = async function () {
  console.log('\n🔧 Setting up e2e tests...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const baseUrl = `http://${host}:${port}`;

  // Step 1: Wait for port to open
  console.log(`⏳ Waiting for port ${port} to open...`);
  await waitForPortOpen(port, { host, timeout: 60000 });
  console.log(`✅ Port ${port} is open`);

  // Step 2: Wait for API to be fully ready
  console.log(`⏳ Waiting for API to be ready at ${baseUrl}...`);
  await waitForApiReady(baseUrl);

  console.log('\n✅ Setup complete - ready to run tests\n');

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\n🧹 Tearing down...\n';
};
