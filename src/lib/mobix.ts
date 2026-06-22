// Mobix API client.
//
// The authed POST endpoints (/daftar-produk, /detail-produk) are reached through
// a same-origin proxy (`/api/mobix/...`) that injects the bearer token
// server-side — see vite.config.ts. The browser never sees the token. Images go
// through `/unit-file-serve` (public), also proxied to keep a single origin.

const PROXY = "/api/mobix";

/* ---- raw API shapes (from /openapi.json) ---- */

export interface ProductListItem {
  id: string;
  nama: string;
  slug: string;
  merek: string;
  harga: number;
  tdp: number;
  cicilan: number;
  transmisi: string;
  jarakTempuh: string; // already formatted, e.g. "56746 KM"
  bahanBakar: string;
  thumbnail: string; // relative "/unit-file-serve?path=..."
  plate_no: string;
  type: string;
  year: number;
  color: string;
  category: string;
  odometer: number;
  cabang: string;
  stnk_expiry: string;
  notes_unit: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  slot?: string;
}

export interface ProductDetail {
  id: string;
  nama: string;
  slug: string;
  brand: string;
  harga: number;
  tdp: number;
  cicilan: number;
  lokasi: string;
  galeri: GalleryItem[];
  kelengkapan_dokumen: Record<string, string>;
  deskripsi: string;
  spesifikasi: { label: string; value: string }[];
  harga_sejenis: ProductListItem[];
  plate_no: string;
  type: string;
  year: number;
  color: string;
  category: string;
  odometer: number;
  transmisi: string;
}

export interface ApiEnvelope<T> {
  status: "success" | "failure";
  code: number;
  error: string;
  message: string;
  data: T;
  metadata: {
    total_data?: number;
    page?: number;
    limit?: number;
    total_pages?: number;
    lastRequest?: string;
  };
}

export interface ListRequest {
  merek?: string[];
  judul?: string[];
  tipe?: string[];
  bahan_bakar?: string[];
  kategori?: string[];
  lokasi?: string[];
  transmisi?: string[];
  jarak_tempuh_awal?: number;
  jarak_tempuh_akhir?: number;
  harga_awal?: number;
  harga_akhir?: number;
  ada_foto?: boolean;
  sort?: string[];
  page?: number;
  limit?: number;
}

async function post<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${PROXY}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mobix API ${res.status}: ${text.slice(0, 140)}`);
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  if (json.status === "failure") {
    throw new Error(json.error || json.message || "Mobix API error");
  }
  return json;
}

async function get<T>(path: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${PROXY}${path}`);
  if (!res.ok) throw new Error(`Mobix API ${res.status}`);
  const json = (await res.json()) as ApiEnvelope<T>;
  if (json.status === "failure") {
    throw new Error(json.error || json.message || "Mobix API error");
  }
  return json;
}

/** Live filter values (GET endpoints, see /docs). */
export async function fetchCategories(): Promise<string[]> {
  return (await get<string[]>("/daftar-kategori")).data ?? [];
}
export async function fetchBrands(): Promise<string[]> {
  return (await get<string[]>("/daftar-merek")).data ?? [];
}

const CATEGORY_ACRONYMS = new Set(["MPV", "SUV", "LCGC"]);

/** Display label for a category code, keeping acronyms upper-cased. */
export function prettyCategory(c: string): string {
  const up = c.toUpperCase();
  return CATEGORY_ACRONYMS.has(up) ? up : titleCase(c);
}

export interface ListResult {
  items: ProductListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchUnits(req: ListRequest = {}): Promise<ListResult> {
  const env = await post<ProductListItem[]>("/daftar-produk", {
    ada_foto: true,
    page: 1,
    limit: 12,
    ...req,
  });
  return {
    items: env.data ?? [],
    total: env.metadata.total_data ?? env.data?.length ?? 0,
    page: env.metadata.page ?? 1,
    totalPages: env.metadata.total_pages ?? 1,
  };
}

export async function fetchUnitDetail(slug: string): Promise<ProductDetail> {
  const env = await post<ProductDetail | ProductDetail[]>("/detail-produk", {
    slug,
  });
  const data = Array.isArray(env.data) ? env.data[0] : env.data;
  if (!data) throw new Error("Unit tidak ditemukan");
  return data;
}

/** Resolve an image path/url to a same-origin (proxied) src. */
export function mobixImage(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return pathOrUrl; // "/unit-file-serve?path=..." — proxied in dev
}

/* ---- agent-program derivations (not present in the catalog API) ---- */

/**
 * Estimated agent commission. The public catalog API has no commission field —
 * this is a marketing estimate (~3.4% of price, rounded to Rp 100rb) so the
 * agent UI keeps its commission element. Real payout is set by the program.
 */
export function estimateKomisi(price: number): number {
  if (!price) return 0;
  return Math.round((price * 0.034) / 100_000) * 100_000;
}

export type UnitBadge = "Baru masuk" | "Premium" | null;

export function deriveBadge(item: {
  odometer: number;
  harga: number;
}): UnitBadge {
  if (item.odometer > 0 && item.odometer < 20_000) return "Baru masuk";
  if (item.harga >= 350_000_000) return "Premium";
  return null;
}

/** Title-case an UPPERCASE branch/location code for display, e.g. "BINTARO" -> "Bintaro". */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Minimal view model consumed by the card components. */
export interface CardUnit {
  id: string;
  slug: string;
  title: string;
  branch: string;
  price: number;
  oldPrice: number | null;
  tdp: number;
  cicilan: number;
  komisi: number;
  km: number;
  badge: UnitBadge;
  thumbnail: string | undefined;
}

export function toCardUnit(item: ProductListItem): CardUnit {
  return {
    id: item.id,
    slug: item.slug,
    title: item.nama,
    branch: titleCase(item.cabang || "Mobix"),
    price: item.harga,
    oldPrice: null,
    tdp: item.tdp,
    cicilan: item.cicilan,
    komisi: estimateKomisi(item.harga),
    km: item.odometer,
    badge: deriveBadge(item),
    thumbnail: mobixImage(item.thumbnail),
  };
}
