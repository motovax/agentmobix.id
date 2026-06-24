// Cloudflare Worker — Mobix API proxy for agentmobix.id.
//
// GitHub Pages is static and the Mobix API has no CORS, so this Worker sits in
// front of it: it injects the bearer token (kept as a Worker secret) and adds
// CORS headers. The SPA calls this Worker instead of the API directly.
//
// Deploy:
//   cd worker
//   npx wrangler secret put MOBIX_API_KEY     # paste the Mobix token
//   npx wrangler deploy
//
// Then set the GitHub repo variable VITE_MOBIX_PROXY to this Worker's URL
// (e.g. https://agentmobix-api.<your-subdomain>.workers.dev or a custom route
// like https://api.agentmobix.id).

const API_BASE = "https://mobix.motovax.com";
const CMS_BASE = "https://api.mobixbydss.id";

const ALLOWED_ORIGINS = [
  "https://agenmobix.id",
  "https://www.agenmobix.id",
  "http://localhost:5173",
  "http://localhost:4173",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // CMS image proxy — no auth, cached at CF edge for 24 h.
    if (url.pathname.startsWith("/cms-img/")) {
      const imgPath = url.pathname.slice("/cms-img".length); // "/uploads/..."
      const target = CMS_BASE + imgPath + url.search;
      const upstream = await fetch(target, {
        cf: { cacheEverything: true, cacheTtl: 86400 },
      });
      const respHeaders = new Headers(corsHeaders(origin));
      const ct = upstream.headers.get("Content-Type");
      if (ct) respHeaders.set("Content-Type", ct);
      respHeaders.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    }

    const isCms = url.pathname.startsWith("/api/cms/");

    if (isCms) {
      if (!env.STRAPI_API_KEY) {
        return new Response(
          JSON.stringify({ status: "failure", error: "Proxy misconfigured: STRAPI_API_KEY not set" }),
          { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
        );
      }
      const cmsPath = "/api/" + url.pathname.slice("/api/cms/".length);
      const target = CMS_BASE + cmsPath + url.search;
      const headers = new Headers();
      const contentType = request.headers.get("Content-Type");
      if (contentType) headers.set("Content-Type", contentType);
      headers.set("Authorization", `Bearer ${env.STRAPI_API_KEY}`);
      const init = { method: request.method, headers };
      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.arrayBuffer();
      }
      const upstream = await fetch(target, init);
      const respHeaders = new Headers(corsHeaders(origin));
      const rct = upstream.headers.get("Content-Type");
      if (rct) respHeaders.set("Content-Type", rct);
      return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    }

    if (!env.MOBIX_API_KEY) {
      return new Response(
        JSON.stringify({ status: "failure", error: "Proxy misconfigured: MOBIX_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    const target = API_BASE + url.pathname + url.search;

    const headers = new Headers();
    const contentType = request.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Authorization", `Bearer ${env.MOBIX_API_KEY}`);

    const init = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(target, init);

    const respHeaders = new Headers(corsHeaders(origin));
    const rct = upstream.headers.get("Content-Type");
    if (rct) respHeaders.set("Content-Type", rct);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  },
};
