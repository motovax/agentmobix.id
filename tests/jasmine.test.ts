import { describe, expect, test } from "bun:test";
import {
  buildJasmineWhatsAppHref,
  JASMINE_WHATSAPP,
} from "../src/lib/jasmine";

describe("tautan chat Jasmine", () => {
  test("mengarah ke nomor Call Center utama dengan pesan terisi", () => {
    const message = "Halo, saya mau tanya opsi pembiayaan unit B 1234 XYZ.";
    const url = new URL(buildJasmineWhatsAppHref(message));

    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe(`/${JASMINE_WHATSAPP}`);
    expect(url.searchParams.get("text")).toBe(message);
  });
});
