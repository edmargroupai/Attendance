import { defineConfig, devices } from "@playwright/test";

// Runs against a live Supabase project (see README "End-to-end tests"),
// so this is a manual/local command (`npm run test:e2e`), not part of
// the required CI gate - CI runners sharing IPs could trip Supabase's
// auth rate limits (spec section 7: sign_in_sign_ups = 30/5min/IP), and
// every run signs up and deletes a real throwaway account.
// E2E_BASE_URL lets this same suite run as a production smoke test
// (E2E_BASE_URL=https://your-deploy.vercel.app npm run test:e2e) without
// starting/expecting a local dev server.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isRemote = baseURL !== "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Every test hits a real, shared Supabase project (auth rate limits
  // apply per spec section 7) and the same dev server process - run
  // strictly one at a time rather than racing multiple workers against
  // shared external state.
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: isRemote
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/login",
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    {
      name: "desktop-1366",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
    },
    {
      name: "mobile-390",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
});
