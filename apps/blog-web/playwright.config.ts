import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workspaceRoot = path.resolve(__dirname, '..', '..')
const defaultBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'
const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? 'http://127.0.0.1:43110'

process.env.NEXTAUTH_SECRET ??= 'test-secret'
process.env.ADMIN_EMAIL ??= 'admin@example.com'
process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret'
process.env.NEXT_PUBLIC_API_URL ??= apiBaseUrl

const baseUrlPort = Number(new URL(defaultBaseUrl).port || 3000)

export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: defaultBaseUrl,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],
  webServer: {
    command: `pnpm --filter blog-web exec next dev --hostname 127.0.0.1 --port ${baseUrlPort}`,
    url: defaultBaseUrl,
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    env: {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: 'development',
    },
    timeout: 120_000,
  },
})
