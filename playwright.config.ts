import { defineConfig, devices } from '@playwright/test'

const PORT = 5174

// End-to-end tests run in guest mode (no Supabase account or network writes).
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // A zone west of UTC with DST: evening events have a different UTC date,
    // which is exactly where date-handling bugs show up.
    timezoneId: 'America/Los_Angeles',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // Guest mode needs no backend. Placeholder values override any real .env.local,
    // so e2e runs can never write to a real Supabase project.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'e2e-placeholder-anon-key',
    },
  },
})
