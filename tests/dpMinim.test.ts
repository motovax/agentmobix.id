import { describe, expect, test } from "bun:test";
import {
  fetchDpMinimPackage,
  getDsfDpMinimSummary,
  type DsfSimResult,
} from "../src/lib/dsf";

function dsfResult(
  overrides: Partial<DsfSimResult> = {},
): DsfSimResult {
  return {
    hargaKredit: 150_000_000,
    installmentRounded: 3_860_000,
    totalDownPaymentRounded: 21_323_750,
    downPaymentRounded: 19_500_000,
    downPayment: 19_500_000,
    percentDownPayment: 15,
    totalLoan: 130_500_000,
    rate: "8.5",
    rateEffectiveTwoDigitPercent: "15.2",
    adminFee: 5_500_000,
    disclaimer: [],
    netDisbursement: 126_000_000,
    refundSupplier: 12_277_548,
    allInToSupplier: 138_277_548,
    ...overrides,
  };
}

describe("hasil DP Minim DSF", () => {
  test("memakai langsung TDP, angsuran, dan All In dari respons DSF", () => {
    expect(getDsfDpMinimSummary(dsfResult())).toEqual({
      tdp: 21_323_750,
      installment: 3_860_000,
      allIn: 138_277_548,
    });
  });

  test("tidak menurunkan TDP dari harga dikurangi All In", () => {
    const result = dsfResult();
    const summary = getDsfDpMinimSummary(result);

    expect(summary?.tdp).toBe(21_323_750);
    expect(summary?.tdp).not.toBe(
      (result.hargaKredit ?? 0) - result.allInToSupplier,
    );
  });

  test("menolak hasil DSF yang belum lengkap", () => {
    expect(
      getDsfDpMinimSummary(dsfResult({ allInToSupplier: 0 })),
    ).toBeNull();
  });

  test("fetchDpMinimPackage menolak harga unit kosong", async () => {
    expect(
      await fetchDpMinimPackage({ unitPrice: 0, category: "MPV", year: 2022, tenor: 60 }),
    ).toBeNull();
  });
});
