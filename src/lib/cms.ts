// CMS API client (Strapi at api.mobixbydss.id).
//
// In dev, calls go through the Vite proxy "/api/cms" → api.mobixbydss.id/api.
// In prod, calls go through the same Cloudflare Worker with the /api/cms prefix.

const PROXY_BASE = import.meta.env.VITE_MOBIX_PROXY ?? "";
const CMS = PROXY_BASE ? `${PROXY_BASE}/api/cms` : "/api/cms";

export interface HotDeal {
  id: number | string;
  judul: string;
  slug: string;
  thumbnail?: string | null;
  deskripsi?: string | null;
  konten?: string | null;
}

interface CmsEnvelope<T> {
  status: string;
  data: T;
  error?: string;
  message?: string;
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
  const json = (await res.json()) as CmsEnvelope<T>;
  if (json.status === "failure") throw new Error(json.error || json.message || "CMS error");
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
