import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    hookTimeout: 60_000,
    testTimeout: 30_000,
    maxWorkers: 2,
    coverage: {
      provider: "v8",
    },
  },
});
