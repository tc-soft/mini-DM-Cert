// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
  adapter: node({ mode: "standalone" }),
  env: {
    schema: {
      DATABASE_PATH: envField.string({ context: "server", access: "secret", optional: true }),
      ADMIN_USERNAME: envField.string({ context: "server", access: "secret", optional: true }),
      ADMIN_PASSWORD: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
