import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:5199",
    headless: true,
    viewport: { width: 1280, height: 900 },
    actionTimeout: 8000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npx vite preview --host 0.0.0.0 --port 5199",
    port: 5199,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
