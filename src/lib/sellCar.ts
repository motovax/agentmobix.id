const API_BASE = import.meta.env.VITE_MOBIX_API_BASE || "https://mobix.motovax.com";
const API_KEY = import.meta.env.VITE_MOBIX_MRP_API_KEY || import.meta.env.VITE_MOBIX_API_KEY || "";

export type PriceRow = {
  brand: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  notes: string;
};

export type SellCarData = {
  source: string;
  sourceSheet: string;
  rows: PriceRow[];
  mrpVersion: string;
};

export type SellCarFormData = {
  brand: string;
  model: string;
  year: string;
  variant: string;
  transmission: string;
  color: string;
  mileage: string;
  plate: string;
  stnk: string;
};

export type PriceAdjustment = {
  label: string;
  amount: number;
};

export type SellCarResult = SellCarFormData & {
  basePrice: number;
  recommendedPrice: number;
  priceMin: number;
  priceMax: number;
  adjustments: PriceAdjustment[];
  source: string;
  sourceSheet: string;
  mrpVersion: string;
  notes: string;
};

type MRPOptionsResponse = {
  mrp_version?: string;
  options?: Array<{ brand: string; model: string; variant: string; year: number }>;
};

type MRPQuoteResponse = {
  found: boolean;
  base_price: number;
  recommended_price: number;
  price_min: number;
  price_max: number;
  adjustments?: PriceAdjustment[];
  notes?: string;
  mrp_version?: string;
};

async function mrpFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_KEY) throw new Error("API key MRP belum dikonfigurasi.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${API_KEY}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

async function readAPIError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { message?: string; error?: string };
    return body.message || body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchSellCarData(): Promise<SellCarData> {
  const response = await mrpFetch("/api/mrp/options");
  if (!response.ok) throw new Error(await readAPIError(response, "Gagal memuat pilihan MRP"));
  const data = await response.json() as MRPOptionsResponse;
  return {
    source: "Mobix MRP API",
    sourceSheet: "brand sheets",
    mrpVersion: data.mrp_version || "",
    rows: (data.options || []).map((option) => ({ ...option, price: 0, notes: "" })),
  };
}

export function getBrands(rows: PriceRow[]): string[] {
  return [...new Set(rows.map((row) => row.brand).filter(Boolean))].sort();
}

export function getModels(rows: PriceRow[], brand: string): string[] {
  return [...new Set(rows.filter((row) => !brand || row.brand === brand).map((row) => row.model))].sort();
}

export function getVariants(rows: PriceRow[], brand: string, model: string): string[] {
  return [...new Set(rows.filter((row) => (!brand || row.brand === brand) && row.model === model).map((row) => row.variant))].sort();
}

export function getYears(rows: PriceRow[], brand: string, model: string, variant: string): number[] {
  return [...new Set(rows
    .filter((row) => (!brand || row.brand === brand) && row.model === model && row.variant === variant)
    .map((row) => row.year))].sort((a, b) => b - a);
}

export async function fetchSellCarQuote(form: SellCarFormData): Promise<SellCarResult> {
  const response = await mrpFetch("/api/mrp/quote", {
    method: "POST",
    body: JSON.stringify({
      brand: form.brand,
      model: form.model,
      variant: form.variant,
      year: Number(form.year),
      transmission: form.transmission,
      color: form.color,
    }),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Data harga mobil belum tersedia di MRP. Silakan pilih kombinasi lain.");
    throw new Error(await readAPIError(response, "Gagal menghitung harga mobil"));
  }
  const quote = await response.json() as MRPQuoteResponse;
  if (!quote.found) throw new Error("Data harga mobil belum tersedia di MRP. Silakan pilih kombinasi lain.");
  return {
    ...form,
    basePrice: quote.base_price,
    recommendedPrice: quote.recommended_price,
    priceMin: quote.price_min,
    priceMax: quote.price_max,
    adjustments: quote.adjustments || [],
    source: "Mobix MRP API",
    sourceSheet: "brand sheets",
    mrpVersion: quote.mrp_version || "",
    notes: quote.notes || "",
  };
}

export function getWhatsAppUrl(result: SellCarResult): string {
  const message = [
    "Halo Albert, saya ingin mendapatkan harga lebih tinggi untuk mobil saya.",
    "",
    `Merek: ${result.brand}`,
    `Model: ${result.model}`,
    `Varian: ${result.variant}`,
    `Tahun: ${result.year}`,
    `Transmisi: ${result.transmission}`,
    `Warna: ${result.color}`,
    `Jarak tempuh: ${result.mileage || "-"} km`,
    `Plat: ${result.plate}`,
    `Masa berlaku STNK: ${result.stnk || "-"}`,
    `Rekomendasi harga: Rp ${new Intl.NumberFormat("id-ID").format(result.recommendedPrice)}`,
  ].join("\n");
  return `https://wa.me/6281120200876?text=${encodeURIComponent(message)}`;
}
