import { describe, expect, test } from "bun:test";
import { getDsfApiErrorMessage } from "../src/lib/dsf";

describe("pesan error API DSF", () => {
  test("mengambil message dari respons DSF", () => {
    expect(getDsfApiErrorMessage({ status: false, message: "IP belum di-whitelist" }, 403))
      .toBe("IP belum di-whitelist");
  });

  test("mengambil nested error dan membatasi panjang pesan", () => {
    expect(getDsfApiErrorMessage({ error: { detail: "Paket kredit tidak tersedia" } }))
      .toBe("Paket kredit tidak tersedia");
    expect(getDsfApiErrorMessage({ error: "x".repeat(600) })).toHaveLength(500);
  });

  test("memberi fallback status HTTP", () => {
    expect(getDsfApiErrorMessage({}, 502)).toBe("API DSF merespons HTTP 502");
  });
});
