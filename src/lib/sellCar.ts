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

export type SellCarAIPhotoKind = "vehicle" | "stnk" | "odometer";

export type SellCarAIExtracted = {
  brand: string;
  model: string;
  variant: string;
  year: number;
  transmission: string;
  color: string;
  mileage: number;
  plate_no: string;
  plate_region: string;
  stnk_expiry: string;
};

export type SellCarAICandidate = {
  brand: string;
  model: string;
  variant: string;
  year: number;
  confidence: number;
};

export type SellCarAIExtraction = {
  request_id: string;
  extracted: SellCarAIExtracted;
  confidence: Record<string, number>;
  candidates: SellCarAICandidate[];
  needs_confirmation: string[];
  warnings: string[];
  mrp_version: string;
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

async function prepareAIPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
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

export async function fetchSellCarAIExtraction(
  photos: Record<SellCarAIPhotoKind, File>,
): Promise<SellCarAIExtraction> {
  if (!API_KEY) throw new Error("API key MRP belum dikonfigurasi.");
  const entries = await Promise.all(
    (Object.entries(photos) as Array<[SellCarAIPhotoKind, File]>).map(async ([kind, file]) => [kind, await prepareAIPhoto(file)] as const),
  );
  const body = new FormData();
  for (const [kind, file] of entries) body.append(kind, file, file.name);
  const response = await fetch(`${API_BASE}/api/mrp/ai-extract`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body,
  });
  if (!response.ok) {
    throw new Error(await readAPIError(response, "AIFalcon belum dapat membaca foto. Coba lagi."));
  }
  return response.json() as Promise<SellCarAIExtraction>;
}

function plateRegionFormValue(region: string): string {
  const normalized = region.trim().toUpperCase();
  const values: Record<string, string> = {
    B: "B - DKI Jakarta",
    D: "D - Bandung",
    F: "F - Bogor",
    L: "L - Surabaya",
    AB: "AB - Yogyakarta",
  };
  return values[normalized] || (normalized ? "Lainnya" : "");
}

export function applySellCarAIExtraction(
  current: SellCarFormData,
  result: SellCarAIExtraction,
  rows: PriceRow[],
): SellCarFormData {
  const extracted = result.extracted;
  const matched = rows.find((row) =>
    row.brand === extracted.brand &&
    row.model === extracted.model &&
    row.variant === extracted.variant &&
    row.year === extracted.year
  ) ?? result.candidates
    .map((candidate) => rows.find((row) =>
      row.brand === candidate.brand &&
      row.model === candidate.model &&
      row.variant === candidate.variant &&
      row.year === candidate.year
    ))
    .find((row): row is PriceRow => Boolean(row));

  return {
    ...current,
    brand: matched?.brand || "",
    model: matched?.model || "",
    variant: matched?.variant || "",
    year: matched ? String(matched.year) : "",
    transmission: extracted.transmission || "",
    color: extracted.color || "",
    mileage: extracted.mileage > 0 ? String(extracted.mileage) : "",
    plate: plateRegionFormValue(extracted.plate_region),
    stnk: extracted.stnk_expiry || "",
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
