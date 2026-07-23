import { describe, expect, test } from "bun:test";
import { ensureRequiredCaptionFacts } from "../src/lib/shareCaption";

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
