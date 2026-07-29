import { describe, expect, test } from "bun:test";
import { classifyQuery, isPlateQuery } from "../src/lib/mobix";
import {
  buildCatalogHref,
  buildCatalogSearchParams,
  buildUnitDetailHref,
  getCatalogReturnHref,
} from "../src/lib/catalogSearch";

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

  test("menyimpan pencarian dan filter di URL katalog", () => {
    expect(
      buildCatalogHref({
        query: " Toyota ",
        kategori: "MPV",
        filters: {
          priceMin: 100_000_000,
          priceMax: 200_000_000,
          transmisi: "AUTOMATIC",
          lokasi: "Jakarta",
        },
      }),
    ).toBe(
      "/katalog?q=Toyota&kategori=MPV&harga_min=100000000&harga_max=200000000&transmisi=AUTOMATIC&lokasi=Jakarta",
    );
  });

  test("membawa URL katalog ke detail lalu memulihkannya untuk tombol kembali", () => {
    const catalogHref = "/katalog?q=Toyota&kategori=MPV";
    const detailHref = buildUnitDetailHref("toyota-avanza", catalogHref);

    expect(detailHref).toBe(
      "/unit/toyota-avanza?kembali=%2Fkatalog%3Fq%3DToyota%26kategori%3DMPV",
    );
    expect(getCatalogReturnHref(detailHref.split("?")[1])).toBe(catalogHref);
  });

  test("menolak URL kembali yang bukan katalog internal", () => {
    expect(getCatalogReturnHref("kembali=https%3A%2F%2Fexample.com")).toBe(
      "/katalog",
    );
    expect(getCatalogReturnHref("kembali=%2Fhot-deals")).toBe("/katalog");
  });
});
