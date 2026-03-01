import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: 'artifacts/baseline/{arg}{ext}',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Allow small anti-aliasing/font rasterization differences across CI hosts.
      maxDiffPixels: 300,
    },
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run visual:serve',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 920 } },
    },
  ],
});
