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
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure", // Options: 'on', 'off', 'only-on-failure'
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      // killport is a hack to get around playwright's bizarre globalSetup
      command: "killport 3011 && go run ./cmd/scr",
      port: 3011,
      env: { PORT: "3011" },
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "bun run dev",
      port: 3010,
      env: {
        PORT: "3010",
        API_URL: "http://localhost:3011",
      },
      // We want to avoid live reloading in playwright tests
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
};

export default config;
