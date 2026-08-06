import { describe, expect, test } from "bun:test";
import { extractFalconUnitReferences } from "../src/lib/falcon";

describe("referensi unit dari respons Falcon", () => {
  test("membaca daftar rekomendasi berbasis nomor polisi", () => {
    const references = extractFalconUnitReferences(
      "1. *MITSUBISHI XPANDER ULTIMATE 1.5 AT 2023 — D1121AKO*\n" +
      "2. *HONDA BRIO E 1.2 MT 2021 — D1622UBG*",
    );

    expect(references).toEqual([
      { title: "MITSUBISHI XPANDER ULTIMATE 1.5 AT 2023", plateNo: "D1121AKO" },
      { title: "HONDA BRIO E 1.2 MT 2021", plateNo: "D1622UBG" },
    ]);
  });

  test("menghapus duplikat unit dan menormalisasi spasi nomor polisi", () => {
    expect(
      extractFalconUnitReferences("*Toyota Avanza — B 1234 CD*\n*Toyota Avanza — B1234CD*"),
    ).toHaveLength(1);
  });
});
