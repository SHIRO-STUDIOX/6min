import { join } from "node:path";

import { defineConfig } from "@playwright/test";

// Exercise the owner's actual development launcher, including setup and HMR.
// The production-preview suite in playwright.config.ts cannot catch dev loops.
export default defineConfig({
  testDir: "tests/local-start",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  use: {
    baseURL: "http://localhost:3107",
    browserName: "chromium",
    actionTimeout: 30000,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: `${process.platform === "win32" ? "powershell.exe" : "pwsh"} -NoProfile -ExecutionPolicy Bypass -File ./start.ps1 -Port 3107`,
    url: "http://localhost:3107/api/v1/health",
    reuseExistingServer: false,
    stdout: "pipe",
    timeout: 180000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      // Windows PowerShell cannot load modules from an inherited pwsh 7 path.
      ...(process.platform === "win32"
        ? {
            PSModulePath: join(
              process.env.SystemRoot ?? "C:\\Windows",
              "System32/WindowsPowerShell/v1.0/Modules",
            ),
          }
        : {}),
    },
  },
});
