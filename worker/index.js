// Cloudflare Worker — Mobix API proxy + Open Graph share cards for agenmobix.id.
//
// SPA on GitHub Pages cannot serve per-unit og: meta (static index.html).
// Facebook/Telegram crawlers need server-rendered HTML with og:title/image.
//
// GET /og?u=<slug>
//   - Social crawlers: HTML with Open Graph tags (title, description, image)
//   - Humans: 302 redirect to https://agenmobix.id/share?u=<slug>
//
// Secrets: MOBIX_API_KEY, optional STRAPI_API_KEY, DSF_BEARER_TOKEN

const API_BASE = "https://mobix.motovax.com";
const CMS_BASE = "https://api.mobixbydss.id";
const DSF_BASE = "https://simulation.dipostar.com";
const APP_ORIGIN = "https://agenmobix.id";
const OG_IMAGE_BASE = "https://mobix.motovax.com";

const ALLOWED_ORIGINS = [
  "https://agenmobix.id",
  "https://www.agenmobix.id",
  "http://localhost:5173",
  "http://localhost:4173",
];

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator|redditbot|Screaming Frog/i;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRupiah(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(num))}`;
}

function absoluteImageUrl(pathOrUrl) {
  if (!pathOrUrl) return `${APP_ORIGIN}/mobix-logo.png`;
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const u = new URL(pathOrUrl);
      if (!u.searchParams.has("w")) u.searchParams.set("w", "1200");
      return u.toString();
    } catch {
      return pathOrUrl;
    }
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const u = new URL(OG_IMAGE_BASE + path);
  if (!u.searchParams.has("w")) u.searchParams.set("w", "1200");
  return u.toString();
}

function isCrawler(request) {
  const ua = request.headers.get("User-Agent") || "";
  return CRAWLER_UA.test(ua);
}

async function fetchUnitBySlug(slug, apiKey) {
  const res = await fetch(`${API_BASE}/detail-produk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const data = json?.data;
  if (!data) return null;
  return Array.isArray(data) ? data[0] ?? null : data;
}

function buildOgHtml({ title, description, image, pageUrl, canonicalAppUrl }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const url = escapeHtml(pageUrl);
  const app = escapeHtml(canonicalAppUrl);
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${app}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Agen Mobix" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:secure_url" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:locale" content="id_ID" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />

  <meta http-equiv="refresh" content="0;url=${app}" />
</head>
<body>
  <p><a href="${app}">${t}</a></p>
  <p>${d}</p>
</body>
</html>`;
}

async function handleOpenGraph(request, env, url) {
  const slug = (url.searchParams.get("u") || url.searchParams.get("slug") || "").trim();
  if (!slug) {
    return new Response("Missing unit slug (?u=)", { status: 400 });
  }

  const appShareUrl = `${APP_ORIGIN}/share?u=${encodeURIComponent(slug)}`;
  const ogPageUrl = `${url.origin}/og?u=${encodeURIComponent(slug)}`;

  // Humans: go to the real SPA share page. Crawlers get HTML with og: tags below.
  if (!isCrawler(request) && (request.method === "GET" || request.method === "HEAD")) {
    return Response.redirect(appShareUrl, 302);
  }

  if (!env.MOBIX_API_KEY) {
    return new Response("OG misconfigured: MOBIX_API_KEY not set", { status: 500 });
  }

  const unit = await fetchUnitBySlug(slug, env.MOBIX_API_KEY);
  if (!unit) {
    // Fallback card so share still opens something useful.
    const html = buildOgHtml({
      title: "Unit Mobix",
      description: "Cek unit dan paket di Agen Mobix.",
      image: `${APP_ORIGIN}/mobix-logo.png`,
      pageUrl: ogPageUrl,
      canonicalAppUrl: appShareUrl,
    });
    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const galleryUrl = unit.galeri?.[0]?.url || unit.thumbnail || unit.thumbnail_depan;
  const price =
    formatRupiah(unit.harga_kredit || unit.harga) ||
    formatRupiah(unit.harga);
  const branch = (unit.lokasi || unit.branch || unit.cabang || "Mobix").toString();
  const year = unit.year ? String(unit.year) : "";
  const title = unit.nama || "Unit Mobix";
  const description = [
    price,
    year ? `Tahun ${year}` : "",
    branch ? `Cabang ${branch}` : "",
    "Cek detail & simulasi di Agen Mobix",
  ]
    .filter(Boolean)
    .join(" · ");

  const html = buildOgHtml({
    title,
    description,
    image: absoluteImageUrl(galleryUrl),
    pageUrl: ogPageUrl,
    canonicalAppUrl: appShareUrl,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Short cache so stock/price updates show up reasonably soon.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // Open Graph share card (Facebook popup / link previews).
    if (url.pathname === "/og" || url.pathname === "/og/") {
      return handleOpenGraph(request, env, url);
    }

    // DSF credit simulation proxy — injects DSF bearer token server-side.
    if (url.pathname.startsWith("/api/dsf/")) {
      if (!env.DSF_BEARER_TOKEN) {
        return new Response(
          JSON.stringify({ status: false, error: "Proxy misconfigured: DSF_BEARER_TOKEN not set" }),
          { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
        );
      }
      const dsfPath = url.pathname.slice("/api/dsf".length);
      const target = DSF_BASE + dsfPath + url.search;
      const dsfHeaders = new Headers();
      const dsfCt = request.headers.get("Content-Type");
      if (dsfCt) dsfHeaders.set("Content-Type", dsfCt);
      dsfHeaders.set("Authorization", `Bearer ${env.DSF_BEARER_TOKEN}`);
      const dsfInit = { method: request.method, headers: dsfHeaders };
      if (request.method !== "GET" && request.method !== "HEAD") {
        dsfInit.body = await request.arrayBuffer();
      }
      const dsfUpstream = await fetch(target, dsfInit);
      const dsfResp = new Headers(corsHeaders(origin));
      const dsfRct = dsfUpstream.headers.get("Content-Type");
      if (dsfRct) dsfResp.set("Content-Type", dsfRct);
      return new Response(dsfUpstream.body, { status: dsfUpstream.status, headers: dsfResp });
    }

    // CMS image proxy — no auth, cached at CF edge for 24 h.
    if (url.pathname.startsWith("/cms-img/")) {
      const imgPath = url.pathname.slice("/cms-img".length);
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
