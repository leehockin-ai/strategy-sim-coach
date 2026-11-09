import { defineConfig } from "vitest/config";

// Domain/server-handler tests must not be rewritten into Vite's browser/SSR RPC stubs.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { environment: "node" },
});