import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Household-Account";
const base = process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (normalizedId.includes("/node_modules/recharts/")) {
            return "charts";
          }

          if (
            normalizedId.includes("/node_modules/dexie/") ||
            normalizedId.includes("/node_modules/zod/") ||
            normalizedId.includes("/node_modules/date-fns/")
          ) {
            return "storage";
          }
        },
      },
    },
  },
});
