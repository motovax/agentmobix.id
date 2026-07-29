import { describe, expect, test } from "bun:test";
import { getDsfSimulationRules } from "../src/lib/dsf";
import {
  compactFinancingLabel,
  hasAvailableFinancing,
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

describe("status pembiayaan unit", () => {
  test("menampilkan alasan ringkas untuk unit yang melewati batas usia", () => {
    expect(hasAvailableFinancing(oldPassengerFinancing)).toBe(false);
    expect(compactFinancingLabel(oldPassengerFinancing)).toBe(
      "Kredit DSF tidak tersedia · usia >13 tahun",
    );
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
