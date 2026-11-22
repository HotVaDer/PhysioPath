// Test runner config (Vitest), as in the Next.js docs' Vitest guide.
// Tests run in jsdom, a browser simulated in Node: fast, but no real layout or colours.
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  // "server-only" comes with Next.js, not as its own package: an empty stand-in for tests.
  resolve: { alias: { "server-only": new URL("./app/test/server-only.ts", import.meta.url).pathname } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
  },
});
