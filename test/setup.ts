import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock window.location for tests
Object.defineProperty(window, "location", {
  value: {
    origin: "http://localhost:3000",
    href: "http://localhost:3000",
    hash: "",
  },
  writable: true,
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
});
