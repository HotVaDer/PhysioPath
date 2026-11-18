// An in-memory localStorage for tests. jsdom has one, but on Node 25+ Node's own (file-less, so empty)
// localStorage global can hide it, so tests that read or write storage install this one instead.
import { afterEach, beforeEach, vi } from "vitest";

export function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

// A fresh, empty storage for every test in the file that calls this.
export function useMemoryStorage() {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());
}
