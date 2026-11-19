import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/core/**", "src/adapters/**", "src/app/api/**"],
      // Chama a API paga do Claude; é coberto pelo teste manual descrito no README.
      exclude: ["src/adapters/ia/claude.ts", "src/core/index.ts"],
      reporter: ["text-summary", "html"],
      thresholds: { lines: 85, functions: 85, branches: 75 },
    },
  },
});
