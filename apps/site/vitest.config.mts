import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    // Integracioni testovi (search.test.ts) gađaju pravu dev bazu preko anon
    // ključa — isti pristup kao za RLS provere u projektu. Čita .env.local.
    env: loadEnv(mode, process.cwd(), ""),
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": r("./src"),
      // "server-only" baca grešku van Next.js server okruženja
      "server-only": r("./test/server-only-stub.ts"),
    },
  },
}));
