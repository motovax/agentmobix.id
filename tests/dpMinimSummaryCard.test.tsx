import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DpMinimSummaryCard } from "../src/components/DpMinimSummaryCard";

describe("DpMinimSummaryCard", () => {
  test("menampilkan TDP, cicilan, dan tenor paket DP minimum", () => {
    const html = renderToStaticMarkup(
      <DpMinimSummaryCard
        packageData={{
          tdp: 18_942_000,
          dpReal: 12_500_000,
          cicilan: 3_250_000,
          tenor: 60,
          dpPercent: 15,
        }}
      />,
    );

    expect(html).toContain("DP Minim");
    expect(html).toContain("TDP");
    expect(html).toContain("DP Minim");
    expect(html).not.toContain("TDP DP Minim");
    expect(html).not.toContain("DP Minim Real");
    expect(html).toContain("Rp 18.942.000");
    expect(html).toContain("Rp 12.500.000");
    expect(html).toContain("Rp 3.250.000");
    expect(html).toContain("60 bulan");
  });

  test("menampilkan state loading tanpa nilai lama", () => {
    const html = renderToStaticMarkup(
      <DpMinimSummaryCard packageData={null} loading />,
    );

    expect(html).toContain("Menghitung paket DP minimum");
    expect(html).not.toContain("belum tersedia");
  });

  test("menampilkan arahan hitung ulang saat paket tidak tersedia", () => {
    const html = renderToStaticMarkup(
      <DpMinimSummaryCard packageData={null} />,
    );

    expect(html).toContain("Hitungan DP minimum belum tersedia");
    expect(html).toContain("Simulasi kredit");
  });
});
