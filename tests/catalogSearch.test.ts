import { describe, expect, test } from "bun:test";
import { classifyQuery, isPlateQuery } from "../src/lib/mobix";
import { buildCatalogSearchParams } from "../src/lib/catalogSearch";

describe("klasifikasi pencarian katalog", () => {
  test("memperlakukan kode tipe FE7 sebagai judul kendaraan", () => {
    expect(isPlateQuery("fe7")).toBe(false);
    expect(classifyQuery("fe7")).toEqual({ param: "judul", value: ["fe7"] });
  });

  test("tetap mengenali nomor polisi Indonesia", () => {
    expect(isPlateQuery("B 1234 XYZ")).toBe(true);
    expect(classifyQuery("B 1234 XYZ")).toEqual({
      param: "plate_no",
      value: "B1234XYZ%",
    });
  });

  test("membangun parameter pencarian yang dipakai bersama beranda dan katalog", () => {
    expect(
      buildCatalogSearchParams("matic", {
        transmisi: "MANUAL",
        lokasi: "Jakarta",
        priceMin: 100_000_000,
        priceMax: 200_000_000,
      }),
    ).toEqual({
      judul: undefined,
      merek: undefined,
      bahan_bakar: undefined,
      transmisi: ["AUTOMATIC"],
      plate_no: undefined,
      lokasi: ["Jakarta"],
      harga_awal: 100_000_000,
      harga_akhir: 200_000_000,
    });
  });
});
