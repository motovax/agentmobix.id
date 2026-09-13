import { describe, expect, test } from "bun:test";
import { describeAiBackgroundError } from "../src/lib/aiBackground";

describe("describeAiBackgroundError", () => {
  test("kuota penyedia habis (402) diterjemahkan jadi arahan isi ulang", () => {
    const raw =
      "AI background endpoint status 402: Insufficient credits. Add more using https://openrouter.ai/settings/credits";
    const message = describeAiBackgroundError(raw);
    expect(message).toContain("Kuota layanan Foto AI");
    expect(message).not.toContain("402");
    expect(message).not.toContain("openrouter");
  });

  test("rate limit memberi arahan menunggu", () => {
    expect(describeAiBackgroundError("status 429: rate limit exceeded")).toContain(
      "sedang padat",
    );
  });

  test("unauthorized mengarahkan ke cek konfigurasi", () => {
    expect(describeAiBackgroundError("status 401: invalid token")).toContain(
      "ditolak",
    );
  });

  test("error server 5xx diarahkan untuk dicoba lagi", () => {
    expect(describeAiBackgroundError("status 503: service unavailable")).toContain(
      "sedang bermasalah",
    );
  });

  test("masalah jaringan browser dikenali", () => {
    expect(describeAiBackgroundError("Failed to fetch")).toContain("Koneksi");
  });

  test("pesan kosong tetap memberi kalimat yang jelas", () => {
    expect(describeAiBackgroundError("")).toBe(
      "Foto AI gagal dibuat. Coba lagi sebentar lagi.",
    );
  });

  test("pesan yang sudah manusiawi diteruskan apa adanya", () => {
    const raw = "Generate background terlalu lama. Coba lagi sebentar.";
    // Mengandung kata 'terlalu lama' → masuk kategori layanan bermasalah.
    expect(describeAiBackgroundError(raw)).toContain("Coba lagi");
  });

  test("pesan singkat tanpa kode status diteruskan apa adanya", () => {
    const raw = "Foto sumber tidak didukung.";
    expect(describeAiBackgroundError(raw)).toBe(raw);
  });

  test("pesan teknis panjang dengan URL tidak dibocorkan ke agen", () => {
    const raw =
      "upstream provider returned an unexpected payload while calling https://internal.example.com/v1/images/edits with a very long trace identifier attached";
    expect(describeAiBackgroundError(raw)).toBe(
      "Foto AI gagal dibuat. Coba lagi sebentar lagi.",
    );
  });
});
