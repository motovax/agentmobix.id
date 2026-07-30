import { describe, expect, test } from "bun:test";
import { getDsfSimulationRules } from "../src/lib/dsf";
import {
  compactFinancingLabel,
  financingValueLabel,
  hasAvailableFinancing,
  isDsfFinancingUnavailable,
  type ProductFinancing,
} from "../src/lib/mobix";

const oldPassengerFinancing: ProductFinancing = {
  status: "ineligible",
  eligible: false,
  provider: "DSF",
  reason_code: "vehicle_age_over_limit",
  message: "Unit melebihi batas pembiayaan DSF.",
  vehicle_age_years: 15,
  max_vehicle_age_years: 13,
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
    expect(isDsfFinancingUnavailable(oldPassengerFinancing)).toBe(true);
    expect(compactFinancingLabel(oldPassengerFinancing)).toBe(
      "Kredit DSF tidak tersedia · usia >13 tahun",
    );
  });

  test("mengganti seluruh nilai pembiayaan dengan Hubungi Sales", () => {
    for (const value of ["Rp 150jt", "Rp 30jt", "Rp 4jt/bulan"]) {
      expect(financingValueLabel(oldPassengerFinancing, value)).toBe(
        "Hubungi Sales",
      );
    }
  });

  test("mengenali respons lama yang berisi pesan langsung", () => {
    expect(
      isDsfFinancingUnavailable("Pembiayaan Dsf tidak tersedia"),
    ).toBe(true);
  });

  test("mengganti nilai ketika respons simulasi DSF tidak tersedia", () => {
    expect(
      financingValueLabel(availableFinancing, "Rp 150jt", true),
    ).toBe("Hubungi Sales");
  });

  test("tidak mengganti nilai ketika pembiayaan masih disiapkan", () => {
    const pending: ProductFinancing = {
      ...oldPassengerFinancing,
      status: "pending",
      reason_code: null,
      message: "Simulasi sedang disiapkan.",
    };
    expect(isDsfFinancingUnavailable(pending)).toBe(false);
    expect(financingValueLabel(pending, "Rp 150jt")).toBe("Rp 150jt");
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
  });

  test("menggunakan nama paket DSF kanonis untuk unit usia 12 dan 13 tahun", () => {
    const currentYear = new Date().getFullYear();
    expect(
      getDsfSimulationRules({ category: "MPV", year: currentYear - 12, tenor: 60 })
        .loanPackageName,
    ).toBe("PAKET C12");
    expect(
      getDsfSimulationRules({ category: "LCGC", year: currentYear - 13, tenor: 60 })
        .loanPackageName,
    ).toBe("PAKET C");
  });
});
