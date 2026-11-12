import { describe, expect, test } from "bun:test";
import { offers, notes } from "./fixtures/dpMinim";
import {
  fetchDpMinimSimulation,
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
  test("DP Minim hanya 60 bulan dan membutuhkan ID unit", () => {
    const base = { unitId: "unit-1", unitPrice: 225_000_000, tenor: 60 };
    expect(getDpMinimSimulationParams(base)?.tenor).toBe(60);
    for (const tenor of [12, 36, 48]) expect(getDpMinimSimulationParams({ ...base, tenor })).toBeNull();
    expect(getDpMinimSimulationParams({ ...base, unitId: undefined })).toBeNull();
  });

  test("memakai hasil leasing backend tanpa DSF atau mengarang TDP", async () => {
    const originalFetch = globalThis.fetch;
    let payload: unknown;
    let url = "";
    globalThis.fetch = (async (input, init) => {
      url = String(input); payload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ data: { leasing: "BFI", cash_price: 225_000_000, disbursement: 255_000_000, refund: 13_000_000, minimum_dp: 5_000_000, installment: 8_050_000, tenor_months: 60, source_row: 5, offers, notes, installment_unit: "per_month" } }));
    }) as typeof fetch;
    try {
      const result = await fetchDpMinimSimulation({ unitId: "unit-1", unitPrice: 225_000_000, tenor: 60 });
      expect(url).toEndWith("/kalkulator/dp-minim");
      expect(payload).toEqual({ unit_id: "unit-1", tenor_months: 60 });
      expect(result?.leasingQuote?.leasing).toBe("BFI");
      expect(result?.leasingQuote?.offers).toEqual(offers);
      expect(result?.leasingQuote?.notes).toEqual(notes);
      expect(result?.installmentRounded).toBe(8_050_000);
      expect(getDpMinimTdpKonsumen(1_000_000, result)).toBeNull();
      globalThis.fetch = (async () => new Response("{}", { status: 422 })) as typeof fetch;
      expect(await fetchDpMinimSimulation({ unitId: "unit-1", unitPrice: 225_000_000, tenor: 60 })).toBeNull();
    } finally { globalThis.fetch = originalFetch; }
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

  test("batas Rp1 juta bersifat ketat, bukan minimum Rp5 juta untuk semua", () => {
    for (const [raw, want] of [[-1, 5_000_000], [0, 5_000_000], [999_999, 5_000_000], [1_000_000, 1_000_000], [1_000_001, 1_000_001], [4_000_000, 4_000_000]]) {
      expect(getDpMinimRealDP(100_000_000, 100_000_000 - raw)).toBe(want);
    }
  });

  test("DP Minim Real tidak negatif jika All In di atas harga", () => {
    expect(getDpMinimRealDP(100_000_000, 120_000_000)).toBe(5_000_000);
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

test("caption DP Minim menyertakan semua leasing dan catatan yang sama", async () => {
 const {formatDpMinimOffers}=await import("../src/lib/dsf");
 const copy=formatDpMinimOffers(offers,notes);
 expect(copy).toContain("1. BCA\nDP Minim : Rp 5.000.000\nAngsuran : Rp 6.170.000/bulan");
 expect(copy).toContain("2. MUF\nDP Minim : Rp 4.400.000");
 expect(copy).toContain("3. BFI");expect(copy.match(/\/bulan/g)?.length).toBe(3);
 expect(copy.endsWith(notes.join("\n"))).toBe(true);
});
