import { describe, expect, test } from "bun:test";
import {
  composeShareImageViaBackend,
  mobixAbsoluteMediaUrl,
  mobixImageFetchable,
  mobixImageFetchableWithWidth,
  mobixMediaFetchable,
} from "../src/lib/mobix";

const API_ORIGIN = "https://mobix.motovax.com";
const PHOTO_PATH =
  "/unit-file-serve?path=%2Fdata%2Fvehicle-media%2Fabc%2FB1234XY%2F2026-08%2Ffoto.jpg";

describe("mobixAbsoluteMediaUrl", () => {
  test("path relatif dijadikan absolut di origin Mobix", () => {
    expect(mobixAbsoluteMediaUrl(PHOTO_PATH)).toBe(`${API_ORIGIN}${PHOTO_PATH}`);
  });

  test("path tanpa garis miring depan tetap dapat satu garis miring", () => {
    expect(mobixAbsoluteMediaUrl("unit-file-serve?path=%2Fa.jpg")).toBe(
      `${API_ORIGIN}/unit-file-serve?path=%2Fa.jpg`,
    );
  });

  // Regresi: foto di CDN/CMS lain dulu dipindah paksa ke origin Mobix -> 404,
  // sehingga composedFiles kosong dan share turun ke caption-saja.
  test("URL yang sudah absolut mempertahankan origin aslinya", () => {
    const cdn = "https://api.mobixbydss.id/uploads/foto2.jpg";
    expect(mobixAbsoluteMediaUrl(cdn)).toBe(cdn);
    expect(mobixImageFetchable(cdn)).toBe(cdn);
    expect(mobixMediaFetchable(cdn)).toBe(cdn);
  });

  test("nilai kosong menghasilkan undefined, bukan origin telanjang", () => {
    expect(mobixAbsoluteMediaUrl(undefined)).toBeUndefined();
    expect(mobixAbsoluteMediaUrl("")).toBeUndefined();
    expect(mobixAbsoluteMediaUrl("   ")).toBeUndefined();
  });
});

describe("mobixImageFetchableWithWidth", () => {
  // Regresi: URLSearchParams.toString() mengubah spasi jadi "+" dan "/" jadi
  // "%2F", membuat unit-file-serve membalas 403 untuk nama file berspasi.
  test("query yang sudah ada tidak di-encode ulang saat menambah w", () => {
    const withSpace = "/unit-file-serve?path=/data/Foto Depan.jpg";
    const out = mobixImageFetchableWithWidth(withSpace, 2560)!;
    expect(out).toContain("path=/data/Foto Depan.jpg");
    expect(out).not.toContain("+");
    expect(out).not.toContain("%2F");
    expect(out.endsWith("&w=2560")).toBe(true);
  });

  test("parameter w yang sudah ada diganti, tidak digandakan", () => {
    const out = mobixImageFetchableWithWidth(`${PHOTO_PATH}&w=420`, 2560)!;
    expect(out.match(/[?&]w=/g)?.length).toBe(1);
    expect(out).toContain("w=2560");
  });

  test("tanda tangan URL tidak berubah", () => {
    const signed =
      "https://s3.amazonaws.com/b/f.jpg?X-Amz-Signature=abc123&X-Amz-Expires=900";
    const out = mobixImageFetchableWithWidth(signed, 2560)!;
    expect(out).toContain("X-Amz-Signature=abc123");
    expect(out).toContain("X-Amz-Expires=900");
    expect(out.startsWith("https://s3.amazonaws.com/")).toBe(true);
  });
});

describe("composeShareImageViaBackend", () => {
  // Regresi: source dikirim sebagai path mentah -> "400 invalid source format",
  // jadi seluruh unit jatuh ke compose lokal yang jauh lebih rapuh.
  test("source selalu dikirim sebagai URL absolut", async () => {
    const originalFetch = globalThis.fetch;
    let requested = "";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requested = String(input);
      return new Response(new Blob(["x"], { type: "image/jpeg" }), { status: 200 });
    }) as typeof fetch;

    try {
      await composeShareImageViaBackend({
        source: PHOTO_PATH,
        price: 0,
        tdp: 0,
        includeOverlay: false,
        width: 1280,
        height: 720,
        crop: "cover",
      });
      const source = new URL(requested).searchParams.get("source")!;
      expect(source.startsWith("https://")).toBe(true);
      expect(source).toBe(`${API_ORIGIN}${PHOTO_PATH}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("source kosong tidak menembak backend sama sekali", async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    try {
      const out = await composeShareImageViaBackend({
        source: "",
        price: 0,
        tdp: 0,
        includeOverlay: false,
        crop: "cover",
      });
      expect(out).toBeNull();
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
