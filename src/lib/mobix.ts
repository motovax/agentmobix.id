// Mobix API client.
//
// Browser calls the Mobix API origin directly with a Developer API key.
// In dev and production, calls use the same direct API configuration.
// In production, set VITE_MOBIX_API_KEY to the Motovax Developer API key.
// CORS and readable fields are configured in Motovax Developer API.
const API_BASE = import.meta.env.VITE_MOBIX_API_BASE || "https://mobix.motovax.com";
const API_KEY = import.meta.env.VITE_MOBIX_API_KEY || "";

// Photos are public and served by the Mobix API origin.
//
// CORS is configured in Motovax Developer API.
const IMG_BASE = import.meta.env.VITE_MOBIX_IMAGE_BASE || API_BASE;
export const MOBIX_THUMBNAIL_WIDTH = 420;
export const MOBIX_HERO_WIDTH = 1600;
export const MOBIX_SHARE_WIDTH = 2560;

function withWidth(url: string, width: number) {
  const [path, search = ""] = url.split("?", 2);
  const params = new URLSearchParams(search);
  params.set("w", String(width));
  return `${path}?${params.toString()}`;
}

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
  posisi: string;
  aging: number;
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
  harga_kredit?: number;
  tdp: number;
  cicilan: number;
  lokasi: string;
  posisi: string;
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
  aging: number;
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

export type ShareImageCrop = "cover" | "contain";

export interface ShareImageRequest {
  source: string;
  price: number;
  tdp: number;
  includeOverlay?: boolean;
  width?: number;
  height?: number;
  crop?: ShareImageCrop;
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
  aging_awal?: number;
  aging_akhir?: number;
  page?: number;
  limit?: number;
  plate_no?: string;
}

/** Returns true if the query looks like an Indonesian plate number (e.g. B2697FOD, D 1234 ABC). */
export function isPlateQuery(q: string): boolean {
  return /^[A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{1,3}$/i.test(q.trim());
}

const BAHAN_BAKAR_MAP: Record<string, string> = {
  bensin: "bensin",
  bbm: "bensin",
  solar: "diesel",
  diesel: "diesel",
  hybrid: "hybrid",
  listrik: "listrik",
  electric: "listrik",
  ev: "listrik",
};

const TRANSMISI_MAP: Record<string, string> = {
  manual: "MANUAL",
  mt: "MANUAL",
  matic: "AUTOMATIC",
  automatic: "AUTOMATIC",
  at: "AUTOMATIC",
  otomatis: "AUTOMATIC",
};

const KNOWN_BRANDS = [
  "toyota", "honda", "suzuki", "daihatsu", "mitsubishi", "nissan", "isuzu",
  "wuling", "chery", "byd", "hyundai", "kia", "bmw", "mercedes", "audi",
  "mazda", "ford", "chevrolet", "jeep", "lexus", "subaru", "volkswagen",
  "peugeot", "renault", "volvo", "landrover", "land rover", "porsche",
];

export type QueryClassification =
  | { param: "plate_no"; value: string }
  | { param: "bahan_bakar"; value: string[] }
  | { param: "transmisi"; value: string[] }
  | { param: "merek"; value: string[] }
  | { param: "judul"; value: string[] };

export function classifyQuery(q: string): QueryClassification {
  const trimmed = q.trim();
  const lower = trimmed.toLowerCase();

  if (isPlateQuery(trimmed)) return { param: "plate_no", value: trimmed };
  if (BAHAN_BAKAR_MAP[lower]) return { param: "bahan_bakar", value: [BAHAN_BAKAR_MAP[lower]] };
  if (TRANSMISI_MAP[lower]) return { param: "transmisi", value: [TRANSMISI_MAP[lower]] };
  if (KNOWN_BRANDS.includes(lower)) return { param: "merek", value: [trimmed] };
  return { param: "judul", value: [trimmed] };
}

async function post<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
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
  const headers: Record<string, string> = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Mobix API ${res.status}`);
  const json = (await res.json()) as ApiEnvelope<T>;
  if (json.status === "failure") {
    throw new Error(json.error || json.message || "Mobix API error");
  }
  return json;
}

export interface CabangDetail {
  nama: string;
  alamat: string;
  lat: number;
  lng: number;
  telepon: string;
  pic: string;
  stok_ready: number;
}

/** Live filter values (GET endpoints, see /docs). */
export async function fetchCategories(): Promise<string[]> {
  return (await get<string[]>("/daftar-kategori")).data ?? [];
}
export async function fetchBrands(): Promise<string[]> {
  return (await get<string[]>("/daftar-merek")).data ?? [];
}
export async function fetchCabang(): Promise<CabangDetail[]> {
  return (await get<CabangDetail[]>("/daftar-cabang")).data ?? [];
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
    ...(req.plate_no ? {} : { ada_foto: true }),
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

/** Resolve an image path/url to a loadable src (absolute in prod, proxied in dev). */
export function mobixImage(
  pathOrUrl: string | undefined,
  width?: number,
): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//.test(pathOrUrl)) return withWidth(pathOrUrl, width ?? MOBIX_THUMBNAIL_WIDTH);
  const url = `${IMG_BASE}${pathOrUrl}`;
  const w = width ?? MOBIX_THUMBNAIL_WIDTH;
  return withWidth(url, w);
}

/**
 * Image URL on the Mobix API origin. CORS is configured in Developer API so
 * fetch() can read the blob for navigator.share({ files }).
 */
export function mobixImageFetchable(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  const path = /^https?:\/\//.test(pathOrUrl)
    ? new URL(pathOrUrl).pathname + new URL(pathOrUrl).search
    : pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE}${path}`;
}

export function mobixImageFetchableWithWidth(
  pathOrUrl: string | undefined,
  width: number,
): string | undefined {
  if (!pathOrUrl) return undefined;
  const base = mobixImageFetchable(pathOrUrl);
  if (!base) return undefined;
  return withWidth(base, width);
}

/**
 * Build a composed share image on the backend (Mobix API) and return the JPEG blob.
 * Returns `null` instead of throwing so the caller can fallback to browser-side compose.
 */
export async function composeShareImageViaBackend(
  request: ShareImageRequest,
): Promise<Blob | null> {
  const url = new URL(`${API_BASE}/share-image`);
  url.searchParams.set("source", request.source);
  url.searchParams.set("price", String(request.price ?? 0));
  url.searchParams.set("tdp", String(request.tdp ?? 0));
  url.searchParams.set("overlay", request.includeOverlay ? "1" : "0");
  url.searchParams.set("crop", request.crop || "cover");

  if (request.width) {
    url.searchParams.set("w", String(request.width));
  }
  if (request.height) {
    url.searchParams.set("h", String(request.height));
  }

  try {
    const headers: Record<string, string> = {};
    if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
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
  posisi: string;
  plateNo: string;
  price: number;
  oldPrice: number | null;
  tdp: number;
  cicilan: number;
  komisi: number;
  km: number;
  year: number;
  badge: UnitBadge;
  thumbnail: string | undefined;
  komisiLabel: string;
}

export function toCardUnit(item: ProductListItem): CardUnit {
  return {
    id: item.id,
    slug: item.slug,
    title: item.nama,
    branch: titleCase(item.cabang || "Mobix"),
    posisi: titleCase(item.posisi || item.cabang || "Mobix"),
    plateNo: item.plate_no || "",
    price: item.harga,
    oldPrice: null,
    tdp: item.tdp,
    cicilan: item.cicilan,
    komisi: estimateKomisi(item.harga),
    km: item.odometer,
    year: item.year,
    badge: deriveBadge(item),
    thumbnail: mobixImage(item.thumbnail),
    komisiLabel: (item.aging ?? 0) > 60 ? "+Rp 2 juta" : "Mulai dari 2jt",
  };
}
