import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side env (no VITE_ prefix): the Mobix bearer token never reaches the
  // client — it's injected here, in the dev proxy, into the Authorization header.
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.MOBIX_API_BASE || "https://mobix.motovax.com";
  const token = env.MOBIX_API_KEY || "";
  const cmsBase = env.CMS_API_BASE || "https://api.mobixbydss.id";
  const strapiToken = env.STRAPI_API_KEY || "";
  const dsfBase = env.DSF_BASE_URL || "https://simulation.dipostar.com";
  const dsfToken = env.DSF_BEARER_TOKEN || "";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      proxy: {
        // Authed POST endpoints — proxied so the token stays server-side.
        "/api/mobix": {
          target: apiBase,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/mobix/, ""),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
        // Public image endpoint — no auth, proxied only to keep one origin.
        "/unit-file-serve": {
          target: apiBase,
          changeOrigin: true,
        },
        // Strapi CMS API — proxied to inject token server-side.
        "/api/cms": {
          target: cmsBase,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/cms/, "/api"),
          headers: strapiToken ? { Authorization: `Bearer ${strapiToken}` } : undefined,
        },
        // DSF credit simulation — proxied to inject DSF token server-side.
        "/api/dsf": {
          target: dsfBase,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/dsf/, ""),
          headers: dsfToken ? { Authorization: `Bearer ${dsfToken}` } : undefined,
        },
      },
    },
  };
});
