/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { defineConfig, devices } from '@playwright/test';

const port = 8765;

/** End-to-end tests of the host overlay, run against `pnpm build`'s output. */
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  // Tests within a file share one imported book and run in order.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 800, height: 1000 }
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory build`,
    url: `http://127.0.0.1:${port}/manage.html`,
    reuseExistingServer: !process.env.CI,
    // http.server prints a traceback for every request the browser aborts.
    stderr: 'ignore'
  }
});
