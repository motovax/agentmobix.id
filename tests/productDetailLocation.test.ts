import { describe, expect, test } from "bun:test";
import { normalizeProductDetailLocation } from "../src/lib/mobix";

describe("lokasi detail produk IMS", () => {
  test("membaca kontrak detail API branch dan position", () => {
    expect(normalizeProductDetailLocation({
      branch: "PONDOK BAMBU",
      position: "BINTARO",
    })).toEqual({
      lokasi: "PONDOK BAMBU",
      posisi: "BINTARO",
    });
  });

  test("tetap mendukung kontrak lama lokasi dan posisi", () => {
    expect(normalizeProductDetailLocation({
      lokasi: "BANDUNG",
      posisi: "SHOWROOM",
      branch: "PONDOK BAMBU",
      position: "BINTARO",
    })).toEqual({
      lokasi: "BANDUNG",
      posisi: "SHOWROOM",
    });
  });

  test("menggunakan cabang saat posisi IMS kosong", () => {
    expect(normalizeProductDetailLocation({
      branch: "CINERE",
      position: " ",
    })).toEqual({
      lokasi: "CINERE",
      posisi: "CINERE",
    });
  });
});
