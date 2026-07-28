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
});
