import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig.json's own "@/*" path mapping — Next.js resolves it
      // automatically for the app itself, but plain Vite/Vitest doesn't read
      // tsconfig paths on its own, so a test importing a lib file that in
      // turn imports a component via "@/..." (e.g. `aiGlossary.test.ts` →
      // `aiGlossary.tsx` → `@/components/ui/ItemHintPanel`) would otherwise
      // fail to resolve it at all.
      "@": path.resolve(__dirname, "./src"),
      // `db.ts` starts with `import "server-only"`, whose default export
      // unconditionally throws (it's meant to fail a build that leaks it
      // into a client bundle) — Next.js swaps it for the package's own
      // no-op `empty.js` when bundling actual server code, but plain
      // Node/vitest has no such build step, so `db.test.ts` would throw on
      // import without this alias pointing at that same no-op stub.
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
