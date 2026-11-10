import { describe, expect, test } from "bun:test";
import {
  getDpMinimAllInFromResult,
  getDpMinimRealDP,
  getDpMinimSimulationParams,
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
    refundSupplierActual: 12_277_548,
    allInToSupplier: 138_277_548,
    ...overrides,
  };
}

describe("formula DP Minim dari pencairan aktual DSF", () => {
  test("tenor 60, 48, dan 36 memakai harga aktual dan DP murni minimum", () => {
    for (const tenor of [60, 48, 36]) {
      const params = getDpMinimSimulationParams({
        unitPrice: 180_000_000,
        brand: "Mitsubishi",
        model: "Xpander GLS",
        year: 2022,
        category: "MPV",
        tenor,
      });

      expect(params?.unitPrice).toBe(180_000_000);
      expect(params?.tenor).toBe(tenor);
      expect(params?.dpPercent).toBe(15);
      expect(params?.simulationType).toBe("DP");
      expect(params?.simulationValue).toBe(15);
      expect(params?.paymentType).toBe("ADDB");
    }
  });

  test("unit usia 11-14 tahun memakai DP 20% dan tenor maksimal 48 bulan", () => {
    const params = getDpMinimSimulationParams({
      unitPrice: 150_000_000,
      year: new Date().getFullYear() - 11,
      category: "SUV",
      tenor: 60,
    });

    expect(params?.tenor).toBe(48);
    expect(params?.dpPercent).toBe(20);
    expect(params?.simulationValue).toBe(20);
    expect(params?.paymentType).toBe("ADDB");
  });

  test("pencairan dan refund selalu memakai netDisbursement + refundSupplierActual", () => {
    expect(getDpMinimAllInFromResult(dsfResult())).toBe(138_277_548);
    expect(
      getDpMinimAllInFromResult(
        dsfResult({
          allInToSupplier: 999,
          netDisbursement: 100,
          refundSupplierActual: 20,
        }),
      ),
    ).toBe(120);
    expect(getDpMinimAllInFromResult(null)).toBeNull();
    expect(
      getDpMinimAllInFromResult(
        dsfResult({
          allInToSupplier: 999,
          netDisbursement: 0,
          refundSupplierActual: 20,
        }),
      ),
    ).toBeNull();
  });

  test("DP Minim Real = harga cash − All In (bukan totalDownPaymentRounded DSF)", () => {
    const price = 150_000_000;
    const allIn = getDpMinimAllInFromResult(dsfResult());
    const dpReal = getDpMinimRealDP(price, allIn);

    expect(dpReal).toBe(price - 138_277_548);
    expect(dpReal).not.toBe(dsfResult().totalDownPaymentRounded);
  });

  test("DP Minim Real tidak negatif jika All In di atas harga", () => {
    expect(getDpMinimRealDP(100_000_000, 120_000_000)).toBe(0);
  });

  test("contoh B1743DFX: TDP menambahkan biaya DSF ke DP Minim Real", () => {
    const result = dsfResult({
      netDisbursement: 146_558_000,
      refundSupplierActual: 10_378_981,
      downPaymentRounded: 27_000_000,
      downPayment: 27_000_000,
      totalDownPaymentRounded: 33_442_000,
    });
    const allIn = getDpMinimAllInFromResult(result);
    const dpReal = getDpMinimRealDP(180_000_000, allIn);

    expect(allIn).toBe(156_936_981);
    expect(dpReal).toBe(23_063_019);
    expect(getDpMinimTdpKonsumen(dpReal, result)).toBe(29_505_019);
  });

  test("TDP DP Minim memakai semua komponen biaya dari TDP DSF", () => {
    const result = dsfResult({
      downPaymentRounded: 27_000_000,
      totalDownPaymentRounded: 37_665_200,
    });

    expect(getDpMinimTdpKonsumen(23_063_019, result)).toBe(33_728_219);
    expect(getDpMinimTdpKonsumen(null, result)).toBeNull();
    expect(getDpMinimTdpKonsumen(23_063_019, null)).toBeNull();
  });
});
