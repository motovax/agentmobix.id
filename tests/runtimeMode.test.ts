import { describe, expect, test } from "bun:test";
import { isAgentUserAgent } from "../src/lib/runtime-mode";

describe("deteksi mode AgenMobix", () => {
  test("mendeteksi token User-Agent tanpa membedakan kapital", () => {
    expect(isAgentUserAgent("Mozilla/5.0 AgenMobix/1.4.0", "agenmobix")).toBe(true);
  });

  test("mendeteksi ejaan AgentMobix yang digunakan nama aplikasi", () => {
    expect(
      isAgentUserAgent(
        "Mozilla/5.0 AgentMobix/1.4.0",
        "AgenMobix,AgentMobix",
      ),
    ).toBe(true);
  });

  test("tidak mengaktifkan portal agen untuk browser biasa", () => {
    expect(
      isAgentUserAgent("Mozilla/5.0 Chrome/140.0", "AgenMobix,AgentMobix"),
    ).toBe(false);
  });

  test("fail closed jika token konfigurasi kosong", () => {
    expect(isAgentUserAgent("Mozilla/5.0 AgenMobix/1.4.0", " ")).toBe(false);
  });
});
