// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  vite: { plugins: [{
    name: "email-server-environment",
    config(_config, { mode }) {
      // Server values remain in process.env; never inject into client defines.
      Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
    },
  }], resolve: { alias: {
    "entities/lib/decode.js": fileURLToPath(new URL("./node_modules/entities/lib/decode.js", import.meta.url)),
    "entities/lib/encode.js": fileURLToPath(new URL("./node_modules/entities/lib/encode.js", import.meta.url)),
    "entities": fileURLToPath(new URL("./node_modules/entities", import.meta.url)),
  } } },
  tanstackStart: {
    server: { entry: "server" },
  },
});
