import { describe, expect, test } from "bun:test";
import { classifyQuery, isPlateQuery } from "../src/lib/mobix";

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
});
