import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:33479'
const fortschrittURL = 'http://127.0.0.1:33481'
/** Knotenpunkte built for the old GitHub Pages origin (`DEPLOY_TARGET=pages`), on its own port. */
const pagesURL = 'http://127.0.0.1:33482'

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: process.env.PLAYWRIGHT_WEB_SERVER ?? 'bun run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'DEPLOY_TARGET=pages DEV_PORT=33482 bun run dev',
      url: pagesURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'bun run dev-fortschritt',
      url: fortschrittURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testDir: './knotenpunkte/tests',
      testIgnore: '**/pages/**',
      use: { ...devices['Desktop Chrome'], baseURL },
    },
    {
      name: 'pages',
      testDir: './knotenpunkte/tests/pages',
      use: { ...devices['Desktop Chrome'], baseURL: pagesURL },
    },
    {
      name: 'fortschritt',
      testDir: './fortschritt/tests',
      use: { ...devices['Desktop Chrome'], baseURL: fortschrittURL },
    },
  ],
})
