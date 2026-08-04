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
  ownershipType: string;
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
  /** Estimated or overridden annual vehicle tax (IDR). */
  annualTax?: number;
  /** manual | notes | estimate */
  annualTaxSource?: string;
  /** How many annual tax periods are overdue. */
  taxYearsDead?: number;
  /** Absolute IDR deducted for dead tax. */
  taxDeductionTotal?: number;
};

type MRPOptionsResponse = {
  mrp_version?: string;
  options?: Array<{ brand: string; model: string; variant: string; year: number }>;
};

type APIEnvelope<T> = {
  data?: T;
  message?: string;
  error?: string;
};

type MRPQuoteResponse = {
  found: boolean;
  base_price: number;
  recommended_price: number;
  price_min: number;
  price_max: number;
  adjustments?: PriceAdjustment[] | null;
  notes?: string;
  mrp_version?: string;
  annual_tax?: number;
  annual_tax_source?: string;
  tax_years_dead?: number;
  tax_deduction_total?: number;
};

/** Normalize STNK form value (YYYY-MM / YYYY-MM-DD / MM/YYYY) for MRP quote. */
export function normalizeStnkExpiryForQuote(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return value;
  const mY = value.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mY) {
    const month = mY[1].padStart(2, "0");
    return `${mY[2]}-${month}`;
  }
  return value;
}

const MOBIX_FALLBACK_ROWS: PriceRow[] = [
  {
    brand: "MITSUBISHI",
    model: "Xpander",
    variant: "GLX",
    year: 2021,
    price: 147_000_000,
    notes: "",
  },
];

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

function unwrapAPIData<T>(payload: T | APIEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as APIEnvelope<T>).data !== undefined
  ) {
    return (payload as APIEnvelope<T>).data as T;
  }
  return payload as T;
}

function alignLocalRows(rows: PriceRow[]): PriceRow[] {
  const result = [...rows];
  for (const fallbackRow of MOBIX_FALLBACK_ROWS) {
    const exists = result.some((row) =>
      row.brand === fallbackRow.brand &&
      row.model === fallbackRow.model &&
      row.variant === fallbackRow.variant &&
      row.year === fallbackRow.year
    );
    if (!exists) result.push(fallbackRow);
  }
  return result;
}

async function fetchLocalSellCarData(): Promise<SellCarData> {
  const response = await fetch("/sell-car-price-matrix.json");
  if (!response.ok) throw new Error("Gagal memuat matrix harga lokal");
  const data = await response.json() as Omit<SellCarData, "mrpVersion"> & { mrpVersion?: string };
  return {
    ...data,
    rows: alignLocalRows(data.rows || []),
    mrpVersion: data.mrpVersion || "mobix-local-fallback",
  };
}

export async function fetchSellCarData(): Promise<SellCarData> {
  try {
    const response = await mrpFetch("/api/mrp/options");
    if (!response.ok) throw new Error(await readAPIError(response, "Gagal memuat pilihan MRP"));
    const payload = await response.json() as MRPOptionsResponse | APIEnvelope<MRPOptionsResponse>;
    const data = unwrapAPIData(payload);
    if (Array.isArray(data.options) && data.options.length > 0) {
      return {
        source: "Mobix MRP API",
        sourceSheet: "brand sheets",
        mrpVersion: data.mrp_version || "",
        rows: data.options.map((option) => ({ ...option, price: 0, notes: "" })),
      };
    }
  } catch {
    // Sama seperti mobix-fe: gunakan matrix lokal saat MRP API tidak tersedia.
  }
  return fetchLocalSellCarData();
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

export function buildLocalSellCarResult(
  data: SellCarData,
  form: SellCarFormData,
  currentYear = new Date().getFullYear(),
): SellCarResult | null {
  const normalizedBrand = form.brand.trim().toLowerCase();
  const normalizedModel = form.model.trim().toLowerCase();
  const normalizedVariant = form.variant.trim().toLowerCase();
  const year = Number(form.year);
  const matches = data.rows.filter((row) =>
    row.brand.trim().toLowerCase() === normalizedBrand &&
    row.model.trim().toLowerCase() === normalizedModel &&
    row.variant.trim().toLowerCase() === normalizedVariant &&
    row.year === year &&
    row.price > 0
  );
  if (matches.length === 0) return null;

  const prices = matches.map((row) => row.price);
  const baseMin = Math.min(...prices);
  const baseMax = Math.max(...prices);
  const adjustments: PriceAdjustment[] = [];

  const actualMileage = Number(form.mileage.replace(/\D/g, ""));
  if (form.year && actualMileage > 0) {
    const age = Math.max(1, currentYear - year);
    const standardMileage = age * 15_000;
    const excessMileage = actualMileage - standardMileage;
    if (excessMileage > 0) {
      const amount = Math.floor(excessMileage / 10_000) * -5_000_000;
      if (amount !== 0) adjustments.push({ label: "Penyesuaian jarak tempuh", amount });
    }
  }

  if (form.ownershipType === "Perorangan") {
    adjustments.push({ label: "Penyesuaian atas nama perorangan", amount: -5_000_000 });
  } else if (form.ownershipType === "Perusahaan") {
    adjustments.push({ label: "Penyesuaian atas nama perusahaan (PT)", amount: -10_000_000 });
  }

  if (form.transmission.toLowerCase().includes("manual")) {
    adjustments.push({ label: "Penyesuaian transmisi manual", amount: -10_000_000 });
  }

  const normalizedColor = form.color.trim().toLowerCase();
  const colorDeductions: Record<string, number> = {
    merah: -10_000_000,
    hijau: -15_000_000,
    biru: -15_000_000,
    oranye: -5_000_000,
  };
  const colorAdjustment = colorDeductions[normalizedColor] || 0;
  if (colorAdjustment !== 0) {
    adjustments.push({ label: `Penyesuaian warna ${form.color}`, amount: colorAdjustment });
  }

  const totalAdjustment = adjustments.reduce((total, adjustment) => total + adjustment.amount, 0);
  const recommendedPrice = Math.max(0, Math.round((baseMin + baseMax) / 2) + totalAdjustment);

  return {
    ...form,
    basePrice: Math.round((baseMin + baseMax) / 2),
    recommendedPrice,
    priceMin: Math.max(0, baseMin + totalAdjustment - 5_000_000),
    priceMax: Math.max(0, baseMax + totalAdjustment + 5_000_000),
    adjustments,
    source: data.source,
    sourceSheet: data.sourceSheet,
    mrpVersion: data.mrpVersion || "mobix-local-fallback",
    notes: matches.map((row) => row.notes).find(Boolean) || "",
  };
}

export async function fetchSellCarQuote(form: SellCarFormData): Promise<SellCarResult> {
  let apiError: Error | null = null;
  try {
    const stnkExpiry = normalizeStnkExpiryForQuote(form.stnk);
    const response = await mrpFetch("/api/mrp/quote", {
      method: "POST",
      body: JSON.stringify({
        brand: form.brand,
        model: form.model,
        variant: form.variant,
        year: Number(form.year),
        transmission: form.transmission,
        color: form.color,
        odometer: Number(form.mileage.replace(/\D/g, "")),
        ownership_type: form.ownershipType.toLowerCase(),
        // Backend reduces recommended_price when tax is overdue.
        ...(stnkExpiry ? { stnk_expiry: stnkExpiry } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(await readAPIError(response, "Gagal menghitung harga mobil"));
    }
    const payload = await response.json() as MRPQuoteResponse | APIEnvelope<MRPQuoteResponse>;
    const quote = unwrapAPIData(payload);
    if (quote.found) {
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
        annualTax: quote.annual_tax ?? 0,
        annualTaxSource: quote.annual_tax_source || "",
        taxYearsDead: quote.tax_years_dead ?? 0,
        taxDeductionTotal: quote.tax_deduction_total ?? 0,
      };
    }
    apiError = new Error("Data harga mobil belum tersedia di MRP. Silakan pilih kombinasi lain.");
  } catch (cause) {
    apiError = cause instanceof Error ? cause : new Error("Gagal menghitung harga mobil");
  }

  const localResult = buildLocalSellCarResult(await fetchLocalSellCarData(), form);
  if (localResult) return localResult;
  throw apiError;
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
    `Atas nama: ${result.ownershipType || "-"}`,
    `Plat: ${result.plate}`,
    `Masa berlaku STNK: ${result.stnk || "-"}`,
    `Rekomendasi harga: Rp ${new Intl.NumberFormat("id-ID").format(result.recommendedPrice)}`,
  ].join("\n");
  return `https://wa.me/6281120200876?text=${encodeURIComponent(message)}`;
}
