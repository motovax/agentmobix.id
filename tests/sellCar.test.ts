import { describe, expect, test } from "bun:test";
import {
  applySellCarAIExtraction,
  buildSellCarQuotePayload,
  buildLocalSellCarResult,
  getModels,
  getSelectedPriceRow,
  getVariants,
  normalizeStnkExpiryForQuote,
  ownershipTypeForQuote,
  searchVehicleColors,
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
  ownershipType: "",
  plate: "",
  stnk: "",
  generationId: "",
  packageIds: [],
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

describe("searchVehicleColors", () => {
  test("tidak memanggil endpoint sebelum query mencapai 3 karakter", async () => {
    const originalFetch = globalThis.fetch;
    let requestCount = 0;
    globalThis.fetch = (() => {
      requestCount += 1;
      throw new Error("fetch seharusnya tidak dipanggil");
    }) as typeof fetch;

    try {
      await expect(searchVehicleColors("ab")).resolves.toEqual([]);
      expect(requestCount).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

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
      ownershipType: "",
      plate: "B - DKI Jakarta",
      stnk: "2027-08",
      generationId: "",
      packageIds: [],
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
      ownershipType: "Perorangan",
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

describe("ownershipTypeForQuote", () => {
  test("maps the three UI ownership labels to API values", () => {
    expect(ownershipTypeForQuote("Perorangan")).toBe("perorangan");
    expect(ownershipTypeForQuote("Perusahaan")).toBe("perusahaan");
    expect(ownershipTypeForQuote("Perusahaan (Rental)")).toBe("perusahaan_rental");
  });

  test("applies company and rental deductions in the local result", () => {
    const company = buildLocalSellCarResult(localData, {
      ...emptyForm,
      brand: "TOYOTA",
      model: "AVANZA",
      variant: "1.3 E MT",
      year: "2022",
      ownershipType: "Perusahaan",
    }, 2026);
    const rental = buildLocalSellCarResult(localData, {
      ...emptyForm,
      brand: "TOYOTA",
      model: "AVANZA",
      variant: "1.3 E MT",
      year: "2022",
      ownershipType: "Perusahaan (Rental)",
    }, 2026);

    expect(company?.recommendedPrice).toBe(95_000_000);
    expect(rental?.recommendedPrice).toBe(90_000_000);
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

describe("MRP dynamic selectors", () => {
  test("memisahkan model dan varian dari matrix aktif", () => {
    const matrix: PriceRow[] = [
      { brand: "TOYOTA", model: "CALYA", variant: "E", year: 2022, price: 0, notes: "" },
      { brand: "TOYOTA", model: "CALYA", variant: "G", year: 2022, price: 0, notes: "" },
      { brand: "TOYOTA", model: "AVANZA", variant: "E", year: 2022, price: 0, notes: "" },
    ];
    expect(getModels(matrix, "TOYOTA")).toEqual(["AVANZA", "CALYA"]);
    expect(getVariants(matrix, "TOYOTA", "CALYA")).toEqual(["E", "G"]);
  });

  test("mengambil opsi generasi dan package hanya dari baris terpilih", () => {
    const option = { id: "generation_1", kind: "generation" as const, label: "Facelift 2022", amount: 5_000_000 };
    const selectedData: SellCarData = {
      source: "test",
      sourceSheet: "test",
      mrpVersion: "v1",
      rows: [{
        brand: "DAIHATSU",
        model: "SIGRA",
        variant: "R",
        year: 2022,
        price: 0,
        notes: "",
        generationOptions: [option],
        packageOptions: [],
      }],
    };
    const selected = getSelectedPriceRow(selectedData, {
      ...emptyForm,
      brand: "DAIHATSU",
      model: "SIGRA",
      variant: "R",
      year: "2022",
    });
    expect(selected?.generationOptions).toEqual([option]);
  });

  test("quote hanya mengirim ID adjustment, bukan nominal dari browser", () => {
    expect(buildSellCarQuotePayload({
      ...emptyForm,
      brand: "DAIHATSU",
      model: "SIGRA",
      variant: "R",
      year: "2022",
      transmission: "Manual",
      color: "Hitam",
      mileage: "50.000",
      ownershipType: "Perorangan",
      generationId: "generation_1",
      packageIds: ["package_1", "package_2"],
      stnk: "08/2027",
    })).toEqual({
      brand: "DAIHATSU",
      model: "SIGRA",
      variant: "R",
      year: 2022,
      transmission: "Manual",
      color: "Hitam",
      odometer: 50000,
      ownership_type: "perorangan",
      generation_id: "generation_1",
      package_ids: ["package_1", "package_2"],
      stnk_expiry: "2027-08",
    });
  });
});
