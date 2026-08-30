import { fileURLToPath } from "node:url";
import { getViteConfig } from "astro/config";

export default getViteConfig({
  resolve: {
    alias: {
      "astro:env/server": fileURLToPath(new URL("./tests/mocks/astro-env-server.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
