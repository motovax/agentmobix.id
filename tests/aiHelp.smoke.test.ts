import { describe, expect, mock, test } from "bun:test";
import {
  executeFalconTurn,
  extractFalconUnitReferences,
  formatFalconReplyHtml,
  looksLikeCreditSimulationOnlyReply,
  prefersUnitDetailFirst,
  type FalconConversationTurn,
} from "../src/lib/falcon";

describe("smoke test Bantuan AI", () => {
  test("respons detail unit selalu dapat diarahkan ke halaman detail produk", async () => {
    const reply = [
      "DETAIL UNIT B2302KRJ — MITSUBISHI Xpander 1.5L Ultimate 2024",
      "",
      "Plat Nomor: B2302KRJ",
      "Status: UNIT READY",
      "Harga cash: Rp 268.000.000",
      "",
      "Mau dibuatkan simulasi kredit untuk unit ini?",
    ].join("\n");
    const ask = mock(async () => ({ reply }));
    const resolveLinks = mock(async (answer: string) => {
      expect(extractFalconUnitReferences(answer)).toEqual([{
        title: "MITSUBISHI Xpander 1.5L Ultimate 2024",
        plateNo: "B2302KRJ",
      }]);
      return [{
        slug: "mitsubishi-xpander-b2302krj",
        title: "MITSUBISHI Xpander 1.5L Ultimate 2024",
        plateNo: "B2302KRJ",
        href: "https://agenmobix.id/unit/mitsubishi-xpander-b2302krj",
        imageSrc: "https://mobix.test/xpander.jpg",
      }];
    });

    const result = await executeFalconTurn("Cari unit B2302KRJ", [], {
      ask,
      resolveLinks,
    });

    expect(ask.mock.calls[0]?.[0]).toContain("DETAIL UNIT");
    expect(ask.mock.calls[0]?.[0]).toContain("JANGAN menampilkan Total DP");
    expect(result.html).toContain("https://agenmobix.id/unit/mitsubishi-xpander-b2302krj");
    expect(result.html).toContain('src="https://mobix.test/xpander.jpg"');
    expect(result.html).toContain("target=\"_blank\"");
    expect(result.html).toContain("Mau dibuatkan simulasi kredit");
    expect(resolveLinks).toHaveBeenCalledTimes(1);
  });

  test("cari unit yang langsung simulasi dikoreksi ke detail unit dulu", async () => {
    const simulationOnly = [
      "MITSUBISHI Xpander 1.5L Ultimate 2024",
      "Price: Rp 268.000.000",
      "Total DP: Rp 46.868.400",
      "Angsuran: Rp 5.780.000 × 60",
    ].join("\n");
    const detailFirst = [
      "DETAIL UNIT B2302KRJ — MITSUBISHI Xpander 1.5L Ultimate 2024",
      "Plat Nomor: B2302KRJ",
      "Status: UNIT READY",
      "Harga cash: Rp 268.000.000",
      "Mau dibuatkan simulasi kredit untuk unit ini?",
    ].join("\n");

    const ask = mock(async (prompt: string) => {
      if (prompt.includes("Koreksi: pengguna meminta detail unit")) {
        return { reply: detailFirst };
      }
      return { reply: simulationOnly };
    });

    const result = await executeFalconTurn("Cari unit: B2302KRJ", [], {
      ask,
      resolveLinks: async () => [{
        slug: "mitsubishi-xpander-b2302krj",
        title: "MITSUBISHI Xpander 1.5L Ultimate 2024",
        plateNo: "B2302KRJ",
        href: "https://agenmobix.id/share?u=mitsubishi-xpander-b2302krj",
        imageSrc: "https://mobix.test/xpander.jpg",
      }],
    });

    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[1]?.[0]).toContain("Plat nomor unit: B2302KRJ");
    expect(result.reply).toContain("DETAIL UNIT B2302KRJ");
    expect(result.reply).toContain("Mau dibuatkan simulasi kredit");
    expect(result.reply.toLowerCase()).not.toContain("total dp");
    expect(result.html).toContain('src="https://mobix.test/xpander.jpg"');
  });

  test("permintaan simulasi memakai plat dari riwayat dan tidak menanyakannya kembali", async () => {
    const conversation: FalconConversationTurn[] = [
      { role: "user", content: "Cari unit B2302KRJ" },
      {
        role: "assistant",
        content: "DETAIL UNIT B2302KRJ — MITSUBISHI XPANDER 2024\nPlat Nomor: B2302KRJ",
      },
    ];
    const ask = mock(async (prompt: string) => {
      if (!prompt.includes("Koreksi:")) {
        return { reply: "Boleh informasikan plat nomor unit yang mana?" };
      }
      return { reply: "Simulasi kredit untuk B2302KRJ: DP 20%, tenor 48 bulan." };
    });

    const result = await executeFalconTurn("Buatkan simulasi kredit", conversation, {
      ask,
      resolveLinks: async () => [],
    });

    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[0]?.[0]).toContain("gunakan plat nomor unit terakhir");
    expect(ask.mock.calls[0]?.[0]).not.toContain("JANGAN menampilkan Total DP");
    expect(ask.mock.calls[1]?.[0]).toContain("plat nomor unit sudah diketahui, yaitu B2302KRJ");
    expect(result.reply).toContain("Simulasi kredit untuk B2302KRJ");
    expect(result.reply.toLowerCase()).not.toContain("informasikan plat");
  });
});

describe("heuristik alur cari unit vs simulasi", () => {
  test("mengenali intent detail unit dulu", () => {
    expect(prefersUnitDetailFirst("Cari unit: B2302KRJ")).toBe(true);
    expect(prefersUnitDetailFirst("Cari unit B2302KRJ")).toBe(true);
    expect(prefersUnitDetailFirst("Buatkan simulasi kredit")).toBe(false);
    expect(prefersUnitDetailFirst("buatkan")).toBe(false);
  });

  test("mengenali balasan simulasi tanpa detail unit", () => {
    expect(looksLikeCreditSimulationOnlyReply([
      "MITSUBISHI Xpander 1.5L Ultimate 2024",
      "Price: Rp 268.000.000",
      "Total DP: Rp 46.868.400",
      "Angsuran: Rp 5.780.000 × 60",
    ].join("\n"))).toBe(true);

    expect(looksLikeCreditSimulationOnlyReply([
      "DETAIL UNIT B2302KRJ — MITSUBISHI Xpander",
      "Plat Nomor: B2302KRJ",
      "Harga cash: Rp 268.000.000",
    ].join("\n"))).toBe(false);
  });

  test("format DETAIL UNIT menampilkan gambar di atas teks", () => {
    const html = formatFalconReplyHtml(
      [
        "DETAIL UNIT B2302KRJ — MITSUBISHI Xpander 1.5L Ultimate 2024",
        "Plat Nomor: B2302KRJ",
        "Status: UNIT READY",
        "Harga cash: Rp 268.000.000",
        "Mau dibuatkan simulasi kredit untuk unit ini?",
      ].join("\n"),
      [{
        slug: "mitsubishi-xpander-b2302krj",
        title: "MITSUBISHI Xpander 1.5L Ultimate 2024",
        plateNo: "B2302KRJ",
        href: "https://agenmobix.id/share?u=mitsubishi-xpander-b2302krj",
        imageSrc: "https://mobix.test/xpander.jpg",
      }],
    );

    expect(html).toContain('src="https://mobix.test/xpander.jpg"');
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("DETAIL UNIT"));
    expect(html).toContain("data-ai-unit-link=\"true\"");
  });
});
