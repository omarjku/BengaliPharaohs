import { defineConfig, devices } from "@playwright/test";

// Run against the production static export:  npm run build && npx playwright test
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", ...devices["Desktop Chrome"], serviceWorkers: "allow" },
  webServer: { command: "npx serve out -l 3000", url: "http://localhost:3000", reuseExistingServer: true },
});
