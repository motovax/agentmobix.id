import { describe, expect, test } from "bun:test";
import { offers, notes } from "./fixtures/dpMinim";
import { renderToStaticMarkup } from "react-dom/server";
import { DpMinimSummaryCard } from "../src/components/DpMinimSummaryCard";

describe("DpMinimSummaryCard", () => {
  test("menampilkan leasing, DP minimum dan cicilan 60 bulan tanpa TDP rekaan", () => {
    const html = renderToStaticMarkup(
      <DpMinimSummaryCard
        packageData={{
          offers, notes,
          leasing: "BFI",
          dpReal: 12_500_000,
          cicilan: 3_250_000,
          tenor: 60,
          dpPercent: 15,
        }}
      />,
    );

    expect(html).toContain("DP Minim");
    for (const leasing of ["1", "BCA", "MUF", "BFI"]) expect(html).toContain(leasing);
    expect(html.match(/\/bulan/g)?.length).toBe(3);
    expect(html).toContain("PIC Leasing Officer");
    expect(html).toContain("DP Minim");
    expect(html).not.toContain("TDP DP Minim");
    expect(html).not.toContain("DP Minim Real");
    expect(html).not.toContain("Rp 18.942.000");
    expect(html).toContain("Rp 4.400.000");
    expect(html).toContain("Rp 8.050.000");
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

test("leasing tidak cover tetap muncul tanpa nominal nol atau angka rekaan", () => {
  const html = renderToStaticMarkup(<DpMinimSummaryCard packageData={{leasing:"BFI",dpReal:5_000_000,cicilan:8_050_000,tenor:60,dpPercent:5,notes,offers:offers.map(o=>o.leasing==="BFI"?o:{...o,available:false,minimum_dp:null,installment:null,reason:"Leasing tidak meng-cover unit ini."})}} />);
  expect(html).toContain("BCA");expect(html).toContain("MUF");expect(html).toContain("BFI");
  expect(html.match(/Tidak tersedia/g)?.length).toBe(4);
  expect(html).not.toContain("Rp 0");
  expect(html.match(/\/bulan/g)?.length).toBe(1);
});
