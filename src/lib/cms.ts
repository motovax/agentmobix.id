// CMS API client (Strapi at api.mobixbydss.id).
//
// In dev, calls go through the Vite proxy "/api/cms" → api.mobixbydss.id/api.
// In prod, calls go through the same Cloudflare Worker with the /api/cms prefix.

const PROXY_BASE = import.meta.env.VITE_MOBIX_PROXY ?? "";
const CMS = PROXY_BASE ? `${PROXY_BASE}/api/cms` : "/api/cms";
// In prod, images are routed through CF Worker (/cms-img) for edge caching.
// In dev, fetched directly from the CMS origin (img tags have no CORS restriction).
const CMS_IMG_BASE = PROXY_BASE ? `${PROXY_BASE}/cms-img` : "https://api.mobixbydss.id";

interface StrapiMediaFormat {
  url: string;
  width: number;
  height: number;
}

export interface StrapiMedia {
  url: string;
  formats?: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  };
}

export interface HotDeal {
  id: number | string;
  judul: string;
  slug: string;
  thumbnail?: StrapiMedia | null;
  deskripsi?: string | null;
  konten?: string | null;
}

/** Resolve a Strapi media object to a full URL. size "thumb" uses the small/thumbnail format. */
export function cmsImageUrl(
  media: StrapiMedia | null | undefined,
  size: "thumb" | "full" = "thumb",
): string | undefined {
  if (!media) return undefined;
  const path =
    size === "full"
      ? (media.formats?.large?.url ?? media.url)
      : (media.formats?.small?.url ?? media.formats?.thumbnail?.url ?? media.url);
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : `${CMS_IMG_BASE}${path}`;
}

interface StrapiEnvelope<T> {
  data: T;
  meta?: unknown;
  error?: unknown;
}

async function postCms<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${CMS}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CMS ${res.status}: ${text.slice(0, 140)}`);
  }
  const json = (await res.json()) as StrapiEnvelope<T>;
  if (json.error) throw new Error("CMS error");
  return json.data;
}

export async function fetchHotDeals(judul = ""): Promise<HotDeal[]> {
  const data = await postCms<HotDeal[] | HotDeal>("/daftar-hot-deals", { judul });
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function fetchHotDealDetail(slug: string): Promise<HotDeal | null> {
  const data = await postCms<HotDeal | HotDeal[]>("/detail-hot-deals", { slug });
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}
