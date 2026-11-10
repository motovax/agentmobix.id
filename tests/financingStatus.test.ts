import { describe, expect, test } from "bun:test";
import {
  getDpMinimSimulationParams,
  getDsfSimulationRules,
  resolveSmartCreditPrice,
} from "../src/lib/dsf";
import {
  compactFinancingLabel,
  financingValueLabel,
  hasAvailableFinancing,
  requiresSalesContact,
  type ProductFinancing,
} from "../src/lib/mobix";

const oldPassengerFinancing: ProductFinancing = {
  status: "ineligible",
  eligible: false,
  provider: "dsf",
  reason_code: "vehicle_age_over_limit",
  message:
    "Unit tahun 2011 berusia 15 tahun dan melebihi batas pembiayaan DSF 14 tahun.",
  vehicle_age_years: 15,
  max_vehicle_age_years: 14,
};

const availableFinancing: ProductFinancing = {
  ...oldPassengerFinancing,
  status: "available",
  eligible: true,
  reason_code: null,
  message: null,
};

describe("status pembiayaan unit", () => {
  test("menampilkan alasan ringkas untuk unit yang melewati batas usia", () => {
    expect(hasAvailableFinancing(oldPassengerFinancing)).toBe(false);
    expect(requiresSalesContact(oldPassengerFinancing)).toBe(true);
    expect(compactFinancingLabel(oldPassengerFinancing)).toBe(
      "Kredit DSF tidak tersedia · usia >14 tahun",
    );
  });

  test("mengganti seluruh nilai pembiayaan dengan Hubungi Sales", () => {
    for (const value of ["Rp 150jt", "Rp 30jt", "Rp 4jt/bulan"]) {
      expect(financingValueLabel(oldPassengerFinancing, value)).toBe(
        "Hubungi Sales",
      );
    }
  });

  test("tidak mengganti nilai hanya karena simulasi DSF tidak tersedia", () => {
    expect(requiresSalesContact(availableFinancing)).toBe(false);
    expect(financingValueLabel(availableFinancing, "Rp 150jt")).toBe(
      "Rp 150jt",
    );
  });

  test("status ineligible tanpa eligible false bukan pemicu", () => {
    const inconsistentResponse = {
      ...oldPassengerFinancing,
      eligible: true,
    };
    expect(requiresSalesContact(inconsistentResponse)).toBe(false);
    expect(financingValueLabel(inconsistentResponse, "Rp 150jt")).toBe(
      "Rp 150jt",
    );
  });

  test("eligible false tetap menjadi satu-satunya pemicu pada status lain", () => {
    const pending: ProductFinancing = {
      ...oldPassengerFinancing,
      status: "pending",
      reason_code: null,
      message: "Simulasi sedang disiapkan.",
    };
    expect(requiresSalesContact(pending)).toBe(true);
    expect(financingValueLabel(pending, "Rp 150jt")).toBe("Hubungi Sales");
  });

  test("tidak mengirim unit penumpang lama ke simulasi DSF", () => {
    const rules = getDsfSimulationRules({
      category: "MPV",
      year: 2011,
      tenor: 60,
    });

    expect(rules.eligible).toBe(false);
    expect(rules.loanPackageName).toBe("Non-DSF");
  });

  test("tetap mengizinkan unit komersial lama", () => {
    const rules = getDsfSimulationRules({
      category: "PICKUP",
      year: 2011,
      tenor: 60,
    });

    expect(rules.eligible).toBe(true);
    expect(rules.vehicleType).toBe("CV");
    expect(rules.minDpPercent).toBe(20);
    expect(rules.fixedDpPercent).toBe(20);
    expect(rules.refundPercentage).toBe(10);
  });

  test("menggunakan Mocil Plus untuk PC usia maksimal 10 tahun", () => {
    const currentYear = new Date().getFullYear();
    const rules = getDsfSimulationRules({
      category: "MPV",
      year: currentYear - 10,
      tenor: 60,
    });

    expect(rules.vehicleType).toBe("PC");
    expect(rules.loanPackageName).toBe("MOCIL PLUS");
    expect(rules.minDpPercent).toBe(15);
    expect(rules.maxTenorMonths).toBe(60);
    expect(rules.refundPercentage).toBe(10);
  });

  test("menggunakan nama paket DSF kanonis untuk B1820CLT usia 11 tahun", () => {
    const currentYear = new Date().getFullYear();
    const rules = getDsfSimulationRules({
      category: "SUV",
      year: currentYear - 11,
      tenor: 60,
    });

    expect(rules.eligible).toBe(true);
    expect(rules.loanPackageName).toBe("PAKET C11");
    expect(rules.minDpPercent).toBe(20);
    expect(rules.maxTenorMonths).toBe(48);
  });

  test("menggunakan paket DSF kanonis dan DP 20% untuk unit usia 12-14 tahun", () => {
    const currentYear = new Date().getFullYear();
    const c12 = getDsfSimulationRules({
      category: "MPV",
      year: currentYear - 12,
      tenor: 60,
    });
    const c13 = getDsfSimulationRules({
      category: "LCGC",
      year: currentYear - 13,
      tenor: 60,
    });
    const c14 = getDsfSimulationRules({
      category: "LCGC",
      year: currentYear - 14,
      tenor: 60,
    });

    expect(c12.loanPackageName).toBe("PAKET C12");
    expect(c13.loanPackageName).toBe("PAKET C");
    expect(c14.loanPackageName).toBe("PAKET C");
    expect(c12.minDpPercent).toBe(20);
    expect(c12.maxTenorMonths).toBe(48);
  });

  test("mengunci tenor unit lama ke 48 bulan dan tetap mengirim target upping OTR", async () => {
    const currentYear = new Date().getFullYear();
    const params = getDpMinimSimulationParams({
      unitPrice: 150_000_000,
      category: "SUV",
      year: currentYear - 11,
      tenor: 60,
    });
    expect(params?.tenor).toBe(48);
    expect(params?.simulationValue).toBe(20);

    const originalFetch = globalThis.fetch;
    let payload: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      payload = JSON.parse(String(init?.body ?? "{}"));
      return new Response(
        JSON.stringify({
          status: true,
          data: { harga_kredit: 155_000_000, refund: { allInToSupplier: 150_000_000 } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      await resolveSmartCreditPrice(
        {
          unitPrice: 155_000_000,
          dpPercent: 20,
          category: "SUV",
          year: currentYear - 11,
          tenor: 60,
        },
        150_000_000,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(payload?.CashPriceTarget).toBe(150_000_000);
    expect(payload?.TenorInMonths).toBe(48);
    expect(payload?.SimulationValue).toBe(20);
    expect(payload?.LoanPackageName).toBe("PAKET C11");
  });
});
