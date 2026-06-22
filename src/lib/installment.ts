// Simple installment simulation for the package calculator.
//
// Calibrated so the design defaults (price 165jt, DP 20%, tenor 60) yield the
// spec's "Rp 3.428.000 / bln". Flat-rate model:
//   monthly = financed * (1/tenor + FLAT_ANNUAL/12)
// where financed = price - downPayment. Rounded to the nearest 1.000.
//
// This is a marketing simulation only ("syarat & ketentuan berlaku") — the real
// quote comes from the leasing partner.

export const FLAT_ANNUAL = 0.1116;
export const TENOR_OPTIONS = [12, 24, 36, 48, 60] as const;
export type Tenor = (typeof TENOR_OPTIONS)[number];

export function downPayment(price: number, dpPercent: number): number {
  return Math.round((price * dpPercent) / 100);
}

export function monthlyInstallment(
  price: number,
  dpPercent: number,
  tenor: number,
): number {
  const financed = Math.max(price - downPayment(price, dpPercent), 0);
  const monthly = financed * (1 / tenor + FLAT_ANNUAL / 12);
  return Math.round(monthly / 1000) * 1000;
}
