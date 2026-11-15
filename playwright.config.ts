import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:6106",
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 6106",
    url: "http://localhost:6106/sandbox",
    reuseExistingServer: false,
    timeout: 120000,
    env: { NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", SHISH_ENV: "test", SHISH_DEMO_MODE: "1", SHISH_SMS_PROVIDER: "mock" },
  },
});
