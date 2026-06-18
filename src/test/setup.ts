import "@testing-library/jest-dom/vitest";
import { expect, beforeEach, afterEach, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes?.("Consider adding an error boundary") ||
    args[0]?.includes?.("React will try to recreate this component tree") ||
    args[0]?.includes?.("There is already a database named") ||
    args[0]?.includes?.("Warning: The current testing environment is not configured to support act(...)")
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
