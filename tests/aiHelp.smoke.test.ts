import { describe, expect, mock, test } from "bun:test";
import {
  executeFalconTurn,
  extractFalconUnitReferences,
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
      }];
    });

    const result = await executeFalconTurn("Cari unit B2302KRJ", [], {
      ask,
      resolveLinks,
    });

    expect(result.html).toContain("https://agenmobix.id/unit/mitsubishi-xpander-b2302krj");
    expect(result.html).toContain("target=\"_blank\"");
    expect(resolveLinks).toHaveBeenCalledTimes(1);
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
    expect(ask.mock.calls[1]?.[0]).toContain("plat nomor unit sudah diketahui, yaitu B2302KRJ");
    expect(result.reply).toContain("Simulasi kredit untuk B2302KRJ");
    expect(result.reply.toLowerCase()).not.toContain("informasikan plat");
  });
});
