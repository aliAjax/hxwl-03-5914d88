import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5103,
  },
  preview: {
    host: "0.0.0.0",
    port: 5103,
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      outputDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/types.ts",
        "src/hooks/index.ts",
      ],
      thresholds: {
        global: {
          branches: 25,
          functions: 20,
          lines: 30,
          statements: 30,
        },
        perFile: {
          branches: 10,
          functions: 10,
          lines: 10,
          statements: 10,
        },
      },
    },
    onConsoleLog(log, type) {
      if (log.includes("Consider adding an error boundary") ||
          log.includes("React will try to recreate this component tree") ||
          log.includes("Error: There is already a database named")) {
        return false;
      }
      return true;
    },
  },
});
