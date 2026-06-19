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
      include: [
        "src/db.ts",
        "src/archive.ts",
        "src/components/BoreholeChart.tsx",
        "src/components/MultiBoreholeChart.tsx",
        "src/components/QualityCheckPanel.tsx",
        "src/hooks/useLayerDepthValidation.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
      ],
      thresholds: {
        global: {
          branches: 40,
          functions: 45,
          lines: 65,
          statements: 65,
        },
        perFile: {
          branches: 40,
          functions: 50,
          lines: 60,
          statements: 60,
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
