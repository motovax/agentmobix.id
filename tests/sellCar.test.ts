import { describe, expect, test } from "bun:test";
import {
  applySellCarAIExtraction,
  type PriceRow,
  type SellCarAIExtraction,
  type SellCarFormData,
} from "../src/lib/sellCar";

const emptyForm: SellCarFormData = {
  brand: "",
  model: "",
  variant: "",
  year: "",
  transmission: "",
  color: "",
  mileage: "",
  plate: "",
  stnk: "",
};

const rows: PriceRow[] = [
  { brand: "TOYOTA", model: "AVANZA", variant: "1.3 E MT", year: 2022, price: 0, notes: "" },
];

function extraction(overrides: Partial<SellCarAIExtraction["extracted"]> = {}): SellCarAIExtraction {
  return {
    request_id: "test",
    extracted: {
      brand: "TOYOTA",
      model: "AVANZA",
      variant: "1.3 E MT",
      year: 2022,
      transmission: "Manual",
      color: "Hitam",
      mileage: 48123,
      plate_no: "B1234XYZ",
      plate_region: "B",
      stnk_expiry: "2027-08",
      ...overrides,
    },
    confidence: {},
    candidates: [],
    needs_confirmation: [],
    warnings: [],
    mrp_version: "test",
  };
}

describe("applySellCarAIExtraction", () => {
  test("fills only a canonical active MRP combination", () => {
    expect(applySellCarAIExtraction(emptyForm, extraction(), rows)).toEqual({
      brand: "TOYOTA",
      model: "AVANZA",
      variant: "1.3 E MT",
      year: "2022",
      transmission: "Manual",
      color: "Hitam",
      mileage: "48123",
      plate: "B - DKI Jakarta",
      stnk: "2027-08",
    });
  });

  test("leaves the MRP selectors empty when extraction has no active match", () => {
    const got = applySellCarAIExtraction(emptyForm, extraction({ model: "UNKNOWN" }), rows);
    expect(got.brand).toBe("");
    expect(got.model).toBe("");
    expect(got.variant).toBe("");
    expect(got.year).toBe("");
    expect(got.mileage).toBe("48123");
  });

  test("maps unsupported plate regions to Lainnya", () => {
    const got = applySellCarAIExtraction(emptyForm, extraction({ plate_region: "N" }), rows);
    expect(got.plate).toBe("Lainnya");
  });
});
