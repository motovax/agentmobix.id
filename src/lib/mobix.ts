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

export interface VideoItem {
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
  video?: VideoItem[];
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

export interface CaptionSuggestRequest {
  slug?: string;
  nama: string;
  warna?: string;
  tahun?: number;
  kilometer?: number;
  kategori?: string;
  transmisi?: string;
  cabang?: string;
  harga_builder?: number;
  harga_kredit?: number;
  tdp?: number;
  cicilan?: number;
  tenor?: number;
  dp?: number;
  dp_pct?: number;
  caption_saat_ini?: string;
  style_hint?: string;
}

export interface AIBackgroundRequest {
  source: string;
  slug?: string;
  nama?: string;
  merek?: string;
  warna?: string;
  tahun?: number;
  angle_hint?: string;
  force?: boolean;
}

export interface AIBackgroundResponse {
  job_id: string;
  source_key: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  image_url?: string;
  cached: boolean;
  message?: string;
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

/** Returns true if the query looks like a full or partial Indonesian plate number. */
export function isPlateQuery(q: string): boolean {
  return /^[A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3}$/i.test(q.trim());
}

function normalizePlateQuery(q: string): string {
  return `${q.replace(/\s+/g, "").toUpperCase()}%`;
}

function normalizePlateValue(q: string): string {
  return q.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function plateCandidateQuery(q: string): string {
  const normalized = normalizePlateValue(q);
  const stem = normalized.match(/^[A-Z]{1,2}\d/)?.[0] ?? "";
  return stem ? `${stem}%` : normalizePlateQuery(normalized);
}

function levenshteinDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    prev.splice(0, prev.length, ...curr);
  }

  return prev[b.length];
}

function fuzzyPlateScore(query: string, plateNo: string): number | null {
  const needle = normalizePlateValue(query);
  const plate = normalizePlateValue(plateNo);
  if (!needle || !plate) return null;
  if (plate === needle) return 0;
  if (plate.startsWith(needle)) return 1;
  if (plate.includes(needle)) return 2;

  const prefix = plate.slice(0, needle.length);
  const prefixPlusOne = plate.slice(0, Math.min(plate.length, needle.length + 1));
  const distance = Math.min(
    levenshteinDistance(needle, prefix),
    levenshteinDistance(needle, prefixPlusOne),
    levenshteinDistance(needle, plate),
  );
  const maxDistance = needle.length >= 6 ? 2 : needle.length >= 4 ? 1 : 0;

  return distance <= maxDistance ? 10 + distance : null;
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

  if (isPlateQuery(trimmed)) return { param: "plate_no", value: normalizePlateQuery(trimmed) };
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

function isNullableScanError(error: unknown) {
  return error instanceof Error && /cannot scan NULL|can't scan into dest/i.test(error.message);
}

/** Live filter values (GET endpoints, see /docs). */
export async function fetchCategories(): Promise<string[]> {
  const categories = (await get<string[]>("/daftar-kategori")).data ?? [];
  const checks = await Promise.allSettled(
    categories.map((category) =>
      post<ProductListItem[]>("/daftar-produk", buildListBody({
        page: 1,
        limit: 1,
        kategori: [category],
      })),
    ),
  );

  return categories.filter((_, index) => {
    const check = checks[index];
    return check.status === "fulfilled" || !isNullableScanError(check.reason);
  });
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

const LIST_FALLBACK_CATEGORIES = ["HATCHBACK", "LCGC", "MPV", "PICKUP", "SUV", "TRUK", "VAN"];
const PLATE_FUZZY_CANDIDATE_LIMIT = 500;

function listEnvelopeToResult(env: ApiEnvelope<ProductListItem[]>): ListResult {
  return {
    items: env.data ?? [],
    total: env.metadata.total_data ?? env.data?.length ?? 0,
    page: env.metadata.page ?? 1,
    totalPages: env.metadata.total_pages ?? 1,
  };
}

function buildListBody(req: ListRequest) {
  return {
    ...(req.plate_no ? {} : { ada_foto: true }),
    page: 1,
    limit: 12,
    ...req,
  };
}

async function fetchUnitsByCategoryFallback(req: ListRequest): Promise<ListResult> {
  const page = req.page ?? 1;
  const limit = req.limit ?? 12;
  const offset = (page - 1) * limit;
  const fallbackLimit = page * limit;
  const settled = await Promise.allSettled(
    LIST_FALLBACK_CATEGORIES.map((category) =>
      post<ProductListItem[]>("/daftar-produk", buildListBody({
        ...req,
        page: 1,
        limit: fallbackLimit,
        kategori: [category],
      })),
    ),
  );

  const fulfilled = settled
    .filter((entry): entry is PromiseFulfilledResult<ApiEnvelope<ProductListItem[]>> =>
      entry.status === "fulfilled",
    )
    .map((entry) => entry.value);

  if (fulfilled.length === 0) {
    throw new Error("Gagal memuat katalog");
  }

  const seen = new Set<string>();
  const items = fulfilled
    .flatMap((env) => env.data ?? [])
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(offset, offset + limit);
  const total = fulfilled.reduce(
    (sum, env) => sum + (env.metadata.total_data ?? env.data?.length ?? 0),
    0,
  );

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function fetchUnitsByFuzzyPlate(req: ListRequest): Promise<ListResult> {
  const query = normalizePlateValue(req.plate_no ?? "");
  const page = req.page ?? 1;
  const limit = req.limit ?? 12;
  const offset = (page - 1) * limit;
  const env = await post<ProductListItem[]>("/daftar-produk", buildListBody({
    ...req,
    ada_foto: true,
    page: 1,
    limit: PLATE_FUZZY_CANDIDATE_LIMIT,
    plate_no: plateCandidateQuery(query),
  }));

  const ranked = (env.data ?? [])
    .map((item, index) => ({
      item,
      index,
      score: fuzzyPlateScore(query, item.plate_no),
    }))
    .filter((entry): entry is { item: ProductListItem; index: number; score: number } =>
      entry.score !== null,
    )
    .sort((a, b) =>
      a.score - b.score ||
      normalizePlateValue(a.item.plate_no).length - normalizePlateValue(b.item.plate_no).length ||
      a.index - b.index,
    );
  const items = ranked.slice(offset, offset + limit).map((entry) => entry.item);
  const total = ranked.length;

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function fetchUnits(req: ListRequest = {}): Promise<ListResult> {
  if (req.plate_no) {
    return fetchUnitsByFuzzyPlate(req);
  }

  try {
    return listEnvelopeToResult(
      await post<ProductListItem[]>("/daftar-produk", buildListBody(req)),
    );
  } catch (error) {
    if (isNullableScanError(error) && !req.kategori?.length && !req.plate_no) {
      return fetchUnitsByCategoryFallback(req);
    }
    throw error;
  }
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

/** Resolve a non-image media path/url (for example video) without image resize params. */
export function mobixMedia(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${IMG_BASE}${pathOrUrl}`;
}

/** Fetchable media URL on the Mobix API origin, without image-specific query params. */
export function mobixMediaFetchable(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  const path = /^https?:\/\//.test(pathOrUrl)
    ? new URL(pathOrUrl).pathname + new URL(pathOrUrl).search
    : pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE}${path}`;
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

export async function suggestShareCaption(
  request: CaptionSuggestRequest,
): Promise<string> {
  const env = await post<{ caption?: string }>("/caption-suggest", request);
  const caption = env.data?.caption?.trim();
  if (!caption) throw new Error("Caption AI kosong");
  return caption;
}

export async function generateAIBackground(
  request: AIBackgroundRequest,
): Promise<AIBackgroundResponse> {
  const env = await post<AIBackgroundResponse>("/ai-background", request);
  return env.data;
}

export async function fetchAIBackgroundStatus(
  jobId: string,
): Promise<AIBackgroundResponse> {
  const env = await get<AIBackgroundResponse>(
    `/ai-background/status?job_id=${encodeURIComponent(jobId)}`,
  );
  return env.data;
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
