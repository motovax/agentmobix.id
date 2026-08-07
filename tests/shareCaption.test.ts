import { describe, expect, test } from "bun:test";
import {
  buildAgenMobixUnitLink,
  buildShareAutoCaption,
  buildWhatsAppShareText,
  CAPTION_CTA,
  CAPTION_HOOK_PREFIX,
  ensureCaptionCta,
  ensureCaptionPrefix,
  ensureRequiredCaptionFacts,
  formatCaptionReadability,
  removeCaptionParagraphsContaining,
} from "../src/lib/shareCaption";

const sections = [
  {
    heading: "Detail unit",
    facts: [
      { line: "Unit: Toyota Calya 2019", matches: ["Toyota Calya 2019"] },
      { line: "KM 77.166", matches: ["KM 77.166", "77.166 KM"] },
      { line: "Pajak/STNK jatuh tempo 10 Okt 2025" },
    ],
  },
  {
    heading: "Paket pembiayaan",
    facts: [
      { line: "Harga Rp 116.870.000", matches: ["Rp 116.870.000"] },
      { line: "TDP 24,7jt", matches: ["24,7jt", "24,7 juta"] },
    ],
  },
];

describe("buildAgenMobixUnitLink", () => {
  test("builds an absolute HTTPS unit link", () => {
    expect(buildAgenMobixUnitLink("toyota-calya-2019")).toBe(
      "https://agenmobix.id/share?u=toyota-calya-2019",
    );
  });

  test("trims and safely encodes the unit identifier", () => {
    expect(buildAgenMobixUnitLink(" toyota calya 2019 ")).toBe(
      "https://agenmobix.id/share?u=toyota%20calya%202019",
    );
  });

  test("falls back to the absolute AgenMobix homepage", () => {
    expect(buildAgenMobixUnitLink()).toBe("https://agenmobix.id");
  });
});

describe("buildWhatsAppShareText", () => {
  test("appends selected photo URLs for WhatsApp link previews", () => {
    expect(buildWhatsAppShareText("Toyota Calya siap dipinang", [
      "https://mobix.motovax.com/photo-1.jpg?w=2560",
    ])).toBe([
      "Toyota Calya siap dipinang",
      "Foto unit:",
      "https://mobix.motovax.com/photo-1.jpg?w=2560",
    ].join("\n\n"));
  });

  test("removes duplicate and empty photo URLs", () => {
    expect(buildWhatsAppShareText("Caption", ["", " https://example.com/a.jpg ", "https://example.com/a.jpg"])).toBe([
      "Caption",
      "Foto unit:",
      "https://example.com/a.jpg",
    ].join("\n\n"));
  });
});

describe("ensureRequiredCaptionFacts", () => {
  test("leaves a caption unchanged when every required value is present", () => {
    const caption =
      "Toyota Calya 2019, 77.166 KM. Pajak/STNK jatuh tempo 10 Okt 2025. Harga Rp116.870.000 dengan TDP 24,7 juta.";

    expect(ensureRequiredCaptionFacts(caption, sections)).toBe(caption);
  });

  test("appends only facts omitted by the AI", () => {
    const caption = "Toyota Calya 2019 cocok untuk keluarga. TDP mulai 24,7jt.";

    expect(ensureRequiredCaptionFacts(caption, sections)).toBe(
      [
        caption,
        "Detail unit\n• KM 77.166\n• Pajak/STNK jatuh tempo 10 Okt 2025",
        "Paket pembiayaan\n• Harga Rp 116.870.000",
      ].join("\n\n"),
    );
  });

  test("matches values despite punctuation, spacing, and case differences", () => {
    const caption =
      "TOYOTA CALYA 2019, KM 77 166, pajak/stnk jatuh tempo 10 okt 2025. Harga rp 116 870 000, TDP 24,7 JT.";

    expect(ensureRequiredCaptionFacts(caption, sections)).toBe(caption);
  });
});

describe("formatCaptionReadability", () => {
  test("adds paragraph breaks without splitting model and odometer decimals", () => {
    expect(
      formatCaptionReadability(
        "Toyota Calya 1.2 G 2019 siap dilirik. KM 77.166. Pajak perlu dicek. Chat saya ya.",
      ),
    ).toBe(
      [
        "Toyota Calya 1.2 G 2019 siap dilirik.",
        "KM 77.166.",
        "Pajak perlu dicek.",
        "Chat saya ya.",
      ].join("\n\n"),
    );
  });
});

describe("removeCaptionParagraphsContaining", () => {
  test("removes AI paragraphs that try to restate protected facts", () => {
    const caption = [
      "Toyota Calya cocok untuk keluarga.",
      "Kilometer 77.166 dan pajak masih panjang.",
      "Tanya detailnya ke saya.",
    ].join("\n\n");

    expect(
      removeCaptionParagraphsContaining(caption, ["km", "kilometer", "pajak", "harga"]),
    ).toBe(
      ["Toyota Calya cocok untuk keluarga.", "Tanya detailnya ke saya."].join("\n\n"),
    );
  });

  test("matches short terms as words instead of substrings", () => {
    expect(removeCaptionParagraphsContaining("Makin praktis untuk keluarga.", ["km"])).toBe(
      "Makin praktis untuk keluarga.",
    );
  });
});

describe("ensureCaptionPrefix", () => {
  test("prepends the fixed sales hook", () => {
    expect(ensureCaptionPrefix("Toyota Calya siap dilirik.")).toBe(
      `${CAPTION_HOOK_PREFIX}\n\nToyota Calya siap dilirik.`,
    );
  });

  test("does not double the prefix when already present", () => {
    expect(
      ensureCaptionPrefix(`${CAPTION_HOOK_PREFIX}\n\nUnit bagus.`),
    ).toBe(`${CAPTION_HOOK_PREFIX}\n\nUnit bagus.`);
  });
});

describe("ensureCaptionCta", () => {
  test("appends the canonical DM CTA", () => {
    expect(ensureCaptionCta("Unit bagus di cabang Bintaro.")).toBe(
      `Unit bagus di cabang Bintaro.\n\n${CAPTION_CTA}`,
    );
  });

  test("replaces the old chat CTA", () => {
    expect(ensureCaptionCta("Unit bagus.\n\nChat saya ya")).toBe(
      `Unit bagus.\n\n${CAPTION_CTA}`,
    );
  });
});

describe("buildShareAutoCaption", () => {
  test("builds prefix + body + CTA with harga and DP minim package", () => {
    expect(
      buildShareAutoCaption([
        "Toyota Calya 2019",
        "• KM 77.166",
        "Harga Rp 116.870.000\nPaket DP Minim 24,7jt\nCicilan 2,5jt/bln • Tenor 60 bulan",
        "Unit tercatat di cabang Bintaro, cek ketersediaannya terlebih dahulu.",
      ]),
    ).toBe(
      [
        CAPTION_HOOK_PREFIX,
        "Toyota Calya 2019",
        "• KM 77.166",
        "Harga Rp 116.870.000\nPaket DP Minim 24,7jt\nCicilan 2,5jt/bln • Tenor 60 bulan",
        "Unit tercatat di cabang Bintaro, cek ketersediaannya terlebih dahulu.",
        CAPTION_CTA,
      ].join("\n\n"),
    );
  });
});
