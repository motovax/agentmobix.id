import { describe, expect, test } from "bun:test";
import {
  buildFalconContextMessage,
  extractFalconUnitReferences,
  formatFalconReplyHtml,
  MAX_FALCON_RECOMMENDATIONS,
  parseFalconSseFrame,
  resolveFalconUnitLinks,
} from "../src/lib/falcon";

describe("konteks percakapan Falcon", () => {
  test("request pertama tetap dikirim tanpa pembungkus konteks", () => {
    expect(buildFalconContextMessage("Cari unit B2302KRJ", [])).toBe(
      "Cari unit B2302KRJ",
    );
  });

  test("follow-up mempertahankan unit dan tawaran dari jawaban sebelumnya", () => {
    const message = buildFalconContextMessage("Buatkan", [
      { role: "user", content: "Cari unit B2302KRJ" },
      {
        role: "assistant",
        content: "Unit B2302KRJ ready. Bisa saya bantu buatkan simulasi kredit unit ini.",
      },
    ]);

    expect(message).toContain("Pengguna: Cari unit B2302KRJ");
    expect(message).toContain("AI Mobix Assistant: Unit B2302KRJ ready");
    expect(message).toContain("Pengguna: Buatkan");
    expect(message).toContain("Jangan tanyakan ulang informasi yang sudah ada");
  });

  test("membatasi riwayat ke enam turn terakhir", () => {
    const conversation = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `turn-${index + 1}`,
    }));

    const message = buildFalconContextMessage("lanjut", conversation);

    expect(message).not.toContain("turn-1");
    expect(message).not.toContain("turn-2");
    expect(message).toContain("turn-3");
    expect(message).toContain("turn-8");
  });
});

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
          href: "https://agenmobix.id/share?u=toyota-calya",
          imageSrc: "https://mobix.test/calya.jpg",
        },
        {
          slug: "honda-mobilio",
          title: "Honda Mobilio",
          plateNo: "B 2863 KYJ",
          href: "https://agenmobix.id/share?u=honda-mobilio",
          imageSrc: "https://mobix.test/mobilio.jpg",
        },
      ],
    );

    expect(html).toContain(
      "Otomatis, 77.166 km.<br/><a href=\"https://agenmobix.id/share?u=toyota-calya\"",
    );
    expect(html.indexOf("Otomatis, 77.166 km.")).toBeLessThan(html.indexOf("toyota-calya"));
    expect(html.indexOf("toyota-calya")).toBeLessThan(html.indexOf("Honda Mobilio"));
    expect(html.indexOf("Otomatis, 138.069 km.")).toBeLessThan(html.indexOf("honda-mobilio"));
    expect(html.indexOf("honda-mobilio")).toBeLessThan(html.indexOf("Saya paling menyarankan"));
    expect(html.match(/<a href=/g)).toHaveLength(2);
    expect(html.match(/data-ai-unit-link="true"/g)).toHaveLength(2);
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('src="https://mobix.test/calya.jpg"');
    expect(html).not.toContain("URL detail unit");
  });

  test("hanya menampilkan lima unit berfoto dan membuang blok sisanya", () => {
    const reply = Array.from({ length: 7 }, (_, index) => (
      `${index + 1}. *Unit ${index + 1} — B${1000 + index}XYZ*\nDetail unit ${index + 1}`
    )).join("\n\n");
    const units = Array.from({ length: 7 }, (_, index) => ({
      slug: `unit-${index + 1}`,
      title: `Unit ${index + 1}`,
      plateNo: `B${1000 + index}XYZ`,
      href: `https://agenmobix.id/share?u=unit-${index + 1}`,
      imageSrc: `https://mobix.test/unit-${index + 1}.jpg`,
    }));

    const html = formatFalconReplyHtml(reply, units);

    expect(html.match(/<img /g)).toHaveLength(MAX_FALCON_RECOMMENDATIONS);
    expect(html.match(/data-ai-unit-link="true"/g)).toHaveLength(MAX_FALCON_RECOMMENDATIONS);
    expect(html).toContain("Unit 5");
    expect(html).not.toContain("Unit 6");
    expect(html).not.toContain("Unit 7");
  });

  test("tidak menampilkan unit tanpa foto atau placeholder", () => {
    const html = formatFalconReplyHtml(
      "1. *Toyota Calya — B2203FFE*\nOtomatis, 77.166 km.",
      [],
    );

    expect(html).not.toContain("Toyota Calya");
    expect(html).not.toContain("<img");
    expect(html).toBe("Belum ada unit dengan foto yang sesuai.");
  });

  test("tetap mengamankan HTML dari jawaban Falcon", () => {
    expect(formatFalconReplyHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });
});

describe("resolusi inventory rekomendasi Falcon", () => {
  test("memfilter foto kosong sebelum mengambil maksimal lima unit", async () => {
    const reply = Array.from({ length: 7 }, (_, index) => (
      `${index + 1}. *Unit ${index + 1} — B${2000 + index}XYZ*`
    )).join("\n");
    const fetch = async ({ plate_no }: { plate_no?: string }) => {
      const unitNumber = Number(plate_no?.slice(1, 5)) - 1999;
      const hasPhoto = unitNumber !== 2;
      return {
        items: [{
          slug: `unit-${unitNumber}`,
          nama: `Unit ${unitNumber}`,
          plate_no: plate_no || "",
          thumbnail_depan: hasPhoto ? `/unit-${unitNumber}.jpg` : "",
          thumbnail: "",
        }],
        total: 1,
        page: 1,
        totalPages: 1,
      };
    };

    const units = await resolveFalconUnitLinks(reply, {
      fetch: fetch as Parameters<typeof resolveFalconUnitLinks>[1]["fetch"],
    });

    expect(units).toHaveLength(5);
    expect(units.map(({ plateNo }) => plateNo)).toEqual([
      "B2000XYZ",
      "B2002XYZ",
      "B2003XYZ",
      "B2004XYZ",
      "B2005XYZ",
    ]);
    expect(units.every(({ imageSrc }) => imageSrc.includes(".jpg?w=420"))).toBe(true);
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
