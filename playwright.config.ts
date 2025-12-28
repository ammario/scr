import { PlaywrightTestConfig, devices } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./e2e",
  testMatch: "e2e/*.spec.ts",
  testIgnore: "**/util/**",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,

  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3010",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    port: 3010,
    env: { PORT: "3010" },
    reuseExistingServer: true,
    timeout: 60000,
  },
};

export default config;
