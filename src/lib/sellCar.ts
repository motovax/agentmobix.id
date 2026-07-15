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

export type SellCarResult = SellCarFormData & {
  basePrice: number;
  recommendedPrice: number;
  source: string;
  sourceSheet: string;
  notes: string;
};

export async function fetchSellCarData(): Promise<SellCarData> {
  const response = await fetch("/sell-car-price-matrix.json");
  if (!response.ok) throw new Error("Gagal memuat matrix harga");
  return (await response.json()) as SellCarData;
}

export function getBrands(rows: PriceRow[]): string[] {
  return [...new Set(rows.map((row) => row.brand).filter(Boolean))].sort();
}

export function getModels(rows: PriceRow[], brand: string): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => !brand || row.brand === brand)
        .map((row) => row.model),
    ),
  ].sort();
}

export function getVariants(rows: PriceRow[], brand: string, model: string): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => (!brand || row.brand === brand) && row.model === model)
        .map((row) => row.variant),
    ),
  ].sort();
}

export function getYears(rows: PriceRow[], brand: string, model: string, variant: string): number[] {
  return [
    ...new Set(
      rows
        .filter(
          (row) =>
            (!brand || row.brand === brand) &&
            row.model === model &&
            row.variant === variant,
        )
        .map((row) => row.year),
    ),
  ].sort((a, b) => b - a);
}

function getAdjustmentFromNotes(notes: string, form: SellCarFormData): number {
  let adjustment = 0;
  const manualAdjustment = notes.match(/(?:MT|Manual)\s*-\s*(\d+)\s*jt/i);
  if (form.transmission === "Manual" && manualAdjustment) {
    adjustment -= Number(manualAdjustment[1]) * 1_000_000;
  }

  const normalizedColor = form.color.trim().toLowerCase();
  const commonColor = ["hitam", "putih", "abu-abu", "abu abu", "abu2"].includes(
    normalizedColor,
  );
  const colorAdjustment = notes.match(/warna selain[\s\S]*?(-\s*\d+)\s*jt/i);
  if (colorAdjustment && !commonColor) {
    adjustment -= Number(colorAdjustment[1].replace(/\s/g, "")) * 1_000_000;
  }
  return adjustment;
}

export function buildSellCarResult(data: SellCarData, form: SellCarFormData): SellCarResult | null {
  const year = Number(form.year);
  const row = data.rows.find(
    (item) =>
      item.brand === form.brand &&
      item.model === form.model &&
      item.variant === form.variant &&
      item.year === year,
  );
  if (!row) return null;
  const recommendedPrice = Math.max(0, row.price + getAdjustmentFromNotes(row.notes, form));
  return {
    ...form,
    basePrice: row.price,
    recommendedPrice,
    source: data.source,
    sourceSheet: data.sourceSheet,
    notes: row.notes,
  };
}

export function getWhatsAppUrl(result: SellCarResult): string {
  const message = [
    "Halo Albert, saya ingin mendapatkan harga tertinggi untuk mobil saya.",
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
    `Estimasi harga: Rp ${new Intl.NumberFormat("id-ID").format(result.recommendedPrice)}`,
  ].join("\n");
  return `https://wa.me/6281120200876?text=${encodeURIComponent(message)}`;
}
