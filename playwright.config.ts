import { defineConfig, devices } from "@playwright/test";

const PORTA = 3200;
const noCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: noCI,
  retries: noCI ? 1 : 0,
  reporter: noCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    trace: "on-first-retry",
  },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] }, testMatch: /navegacao\.spec\.ts/ },
  ],
  webServer: {
    command: noCI ? "npm run start" : "npm run dev",
    port: PORTA,
    reuseExistingServer: !noCI,
    timeout: 120_000,
  },
});
