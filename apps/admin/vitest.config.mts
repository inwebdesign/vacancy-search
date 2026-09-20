import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Samo čisti unit testovi (bez baze) — parsiranje, normalizacija. Provere
// prema bazi (RLS, triggeri) rade se posebnim skriptama protiv dev baze.
export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "@": r("./src"),
      // "server-only" baca grešku van Next.js server okruženja
      "server-only": r("./test/server-only-stub.ts"),
    },
  },
});
