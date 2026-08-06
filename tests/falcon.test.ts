import { describe, expect, test } from "bun:test";
import {
  extractFalconUnitReferences,
  formatFalconReplyHtml,
  parseFalconSseFrame,
} from "../src/lib/falcon";

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

describe("format jawaban Falcon", () => {
  test("menempatkan URL tepat di bawah poin unit yang sesuai", () => {
    const html = formatFalconReplyHtml(
      "1. *Toyota Calya — B 2203 FFE*\nOtomatis, 77.166 km.\n\n2. *Honda Mobilio — B2863KYJ*\nOtomatis, 138.069 km.\n\nSaya paling menyarankan Calya B2203FFE.",
      [
        {
          slug: "toyota-calya",
          title: "Toyota Calya",
          plateNo: "B2203FFE",
          href: "https://agenmobix.id/unit/toyota-calya",
        },
        {
          slug: "honda-mobilio",
          title: "Honda Mobilio",
          plateNo: "B 2863 KYJ",
          href: "https://agenmobix.id/unit/honda-mobilio",
        },
      ],
    );

    expect(html).toContain(
      "Otomatis, 77.166 km.<br/><a href=\"https://agenmobix.id/unit/toyota-calya\"",
    );
    expect(html.indexOf("Otomatis, 77.166 km.")).toBeLessThan(html.indexOf("toyota-calya"));
    expect(html.indexOf("toyota-calya")).toBeLessThan(html.indexOf("Honda Mobilio"));
    expect(html.indexOf("Otomatis, 138.069 km.")).toBeLessThan(html.indexOf("honda-mobilio"));
    expect(html.indexOf("honda-mobilio")).toBeLessThan(html.indexOf("Saya paling menyarankan"));
    expect(html.match(/<a href=/g)).toHaveLength(2);
    expect(html).not.toContain("URL detail unit");
  });

  test("tetap mengamankan HTML dari jawaban Falcon", () => {
    expect(formatFalconReplyHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });
});

describe("parser SSE Falcon", () => {
  test("membaca frame CRLF dan data multi-baris", () => {
    expect(parseFalconSseFrame(
      ": keep-alive\r\n" +
      "event: message\r\n" +
      "data: {\"answer\":\"Halo\"}\r\n" +
      "data: {\"content\":\" dunia\"}",
    )).toEqual({ event: "message", payload: { message: '{"answer":"Halo"}\n{"content":" dunia"}' } });
  });

  test("menerima frame terakhir tanpa baris kosong penutup", () => {
    expect(parseFalconSseFrame('event: message\ndata: {"reply":"Siap"}')).toEqual({
      event: "message",
      payload: { reply: "Siap" },
    });
  });
});
