// Rupiah & short-amount formatting helpers, matching the design's conventions.

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Full rupiah, e.g. 165000000 -> "Rp 165.000.000". */
export function formatRupiah(value: number): string {
  // Intl outputs "Rp 165.000.000" (id-ID uses a non-breaking space).
  return rupiah.format(value).replace(/\s/g, " ");
}

/**
 * Short "juta" amount used on cards, e.g. 165000000 -> "165jt",
 * 5500000 -> "5,5jt", 3428000 -> "3,4jt". Indonesian decimal comma.
 */
export function formatJt(value: number): string {
  const jt = value / 1_000_000;
  if (Number.isInteger(jt)) return `${jt}jt`;
  // one decimal place, comma separator
  return `${jt.toFixed(1).replace(".", ",")}jt`;
}

/** Short with Rp prefix, e.g. "Rp 5,5jt". */
export function formatRpJt(value: number): string {
  return `Rp ${formatJt(value)}`;
}

/** Odometer short, e.g. 36420 -> "36rb km". */
export function formatKm(km: number): string {
  return `${Math.round(km / 1000)}rb km`;
}

/** Odometer grouped, e.g. 36420 -> "36.420". */
export function formatOdometer(km: number): string {
  return new Intl.NumberFormat("id-ID").format(km);
}
