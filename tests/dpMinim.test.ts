import { describe, expect, test } from "bun:test";
import {
  DP_MINIM_ALL_IN_PERCENT,
  getDpMinimAllInFromResult,
  getDpMinimMinDp,
  getDpMinimTargetAllIn,
  getDpMinimTdpKonsumen,
  type DsfSimResult,
} from "../src/lib/dsf";

function dsfResult(overrides: Partial<DsfSimResult> = {}): DsfSimResult {
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

describe("formula DP Minim reverse all-in", () => {
  test("LTV target All In per tenor", () => {
    expect(DP_MINIM_ALL_IN_PERCENT[60]).toBe(0.95);
    expect(DP_MINIM_ALL_IN_PERCENT[48]).toBe(0.925);
    expect(DP_MINIM_ALL_IN_PERCENT[36]).toBe(0.9);
    expect(getDpMinimTargetAllIn(200_000_000, 60)).toBe(190_000_000);
    expect(getDpMinimTargetAllIn(200_000_000, 48)).toBe(185_000_000);
    expect(getDpMinimTargetAllIn(200_000_000, 36)).toBe(180_000_000);
  });

  test("min DP konsumen = (1 − LTV) × harga", () => {
    expect(getDpMinimMinDp(200_000_000, 60)).toBe(10_000_000);
    expect(getDpMinimMinDp(200_000_000, 48)).toBe(15_000_000);
    expect(getDpMinimMinDp(200_000_000, 36)).toBe(20_000_000);
  });

  test("All In dari netDisbursement + refund atau allInToSupplier", () => {
    expect(getDpMinimAllInFromResult(dsfResult())).toBe(138_277_548);
    expect(
      getDpMinimAllInFromResult(
        dsfResult({ allInToSupplier: 0, netDisbursement: 100, refundSupplier: 20 }),
      ),
    ).toBe(120);
    expect(getDpMinimAllInFromResult(null)).toBeNull();
    expect(
      getDpMinimAllInFromResult(
        dsfResult({ allInToSupplier: 0, netDisbursement: 0, refundSupplier: 0 }),
      ),
    ).toBeNull();
  });

  test("TDP konsumen = harga cash − All In (bukan totalDownPaymentRounded DSF)", () => {
    const price = 150_000_000;
    const allIn = getDpMinimAllInFromResult(dsfResult());
    const tdp = getDpMinimTdpKonsumen(price, allIn);

    expect(tdp).toBe(price - 138_277_548);
    expect(tdp).not.toBe(dsfResult().totalDownPaymentRounded);
  });

  test("TDP konsumen tidak negatif jika All In di atas harga", () => {
    expect(getDpMinimTdpKonsumen(100_000_000, 120_000_000)).toBe(0);
  });
});
