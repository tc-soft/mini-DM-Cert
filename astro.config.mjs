// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",

  security: {
    // Behind a TLS-terminating reverse proxy, the raw socket to this container is
    // always plain HTTP, so checkOrigin would otherwise compare the browser's
    // https:// Origin against a wrongly-reconstructed http:// request origin and
    // reject every real form submission. An empty pattern tells Astro to trust the
    // proxy's Host + X-Forwarded-Proto headers for ANY domain — deliberately generic
    // since this image is deployed under different hostnames per instance. This
    // relies on the proxy being the only network path to the container (it must not
    // be reachable directly, e.g. via a published port bypassing the proxy).
    allowedDomains: [{}],
  },

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
