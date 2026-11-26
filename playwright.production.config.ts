import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/production",
  outputDir: "test-results/production",
  timeout: 60000,
  workers: 1,
  use: {
    channel: "chrome",
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
