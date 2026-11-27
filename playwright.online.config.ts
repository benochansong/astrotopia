import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/online-browser",
  outputDir: "test-results/online",
  timeout: 60000,
  workers: 1,
  use: {
    channel: "chrome",
    baseURL: "http://127.0.0.1:5180",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: true,
    },
    {
      command: "npm run dev:server",
      url: "http://127.0.0.1:5190/health",
      reuseExistingServer: false,
      env: { COOP_DATABASE: "server/data/browser-tests.sqlite" },
    },
  ],
  reporter: "list",
});
