import { describe, expect, test } from "bun:test";
import {
  applySellCarAIExtraction,
  buildLocalSellCarResult,
  normalizeStnkExpiryForQuote,
  type PriceRow,
  type SellCarAIExtraction,
  type SellCarData,
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

const localData: SellCarData = {
  source: "test",
  sourceSheet: "test",
  mrpVersion: "test",
  rows: [
    { brand: "TOYOTA", model: "AVANZA", variant: "1.3 E MT", year: 2022, price: 100_000_000, notes: "" },
  ],
};

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

describe("buildLocalSellCarResult", () => {
  test("mengikuti rule fallback mobix-fe untuk KM, transmisi, warna, dan rentang harga", () => {
    const result = buildLocalSellCarResult(localData, {
      ...emptyForm,
      brand: "TOYOTA",
      model: "AVANZA",
      variant: "1.3 E MT",
      year: "2022",
      transmission: "Manual",
      color: "Biru",
      mileage: "95.000",
    }, 2026);

    expect(result?.basePrice).toBe(100_000_000);
    expect(result?.recommendedPrice).toBe(60_000_000);
    expect(result?.priceMin).toBe(55_000_000);
    expect(result?.priceMax).toBe(65_000_000);
    expect(result?.adjustments).toEqual([
      { label: "Penyesuaian jarak tempuh", amount: -15_000_000 },
      { label: "Penyesuaian transmisi manual", amount: -10_000_000 },
      { label: "Penyesuaian warna Biru", amount: -15_000_000 },
    ]);
  });

  test("tidak memotong harga untuk kelebihan KM yang belum mencapai 10.000", () => {
    const result = buildLocalSellCarResult(localData, {
      ...emptyForm,
      brand: "TOYOTA",
      model: "AVANZA",
      variant: "1.3 E MT",
      year: "2022",
      transmission: "Automatic",
      color: "Hitam",
      mileage: "69.999",
    }, 2026);

    expect(result?.recommendedPrice).toBe(100_000_000);
    expect(result?.priceMin).toBe(95_000_000);
    expect(result?.priceMax).toBe(105_000_000);
  });

  test("mengembalikan null saat kombinasi kendaraan tidak ada di matrix lokal", () => {
    expect(buildLocalSellCarResult(localData, {
      ...emptyForm,
      brand: "HONDA",
      model: "BRIO",
      variant: "E",
      year: "2022",
    }, 2026)).toBeNull();
  });
});

describe("normalizeStnkExpiryForQuote", () => {
  test("keeps ISO month/day formats and maps MM/YYYY", () => {
    expect(normalizeStnkExpiryForQuote("2023-04-26")).toBe("2023-04-26");
    expect(normalizeStnkExpiryForQuote("2023-04")).toBe("2023-04");
    expect(normalizeStnkExpiryForQuote("04/2023")).toBe("2023-04");
    expect(normalizeStnkExpiryForQuote("")).toBe("");
  });
});
