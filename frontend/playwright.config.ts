import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:8742",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  reporter: "list",
});
