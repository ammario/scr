import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Node's fetch requires this option for the streaming request bodies used by
// the GCS client. Bun supplies it internally, but Vitest runs under Node.
const nativeFetch = globalThis.fetch;
const fetchWithDuplex = (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.body && !("duplex" in init)) {
    const streamingInit = {
      ...init,
      duplex: "half",
    } as unknown as Parameters<typeof nativeFetch>[1];
    return nativeFetch(input, streamingInit);
  }
  return nativeFetch(input, init);
};
globalThis.fetch = fetchWithDuplex as unknown as typeof globalThis.fetch;

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
