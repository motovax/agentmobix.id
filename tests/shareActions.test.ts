import { describe, expect, test } from "bun:test";
import {
  buildChannelShareUrl,
  canDeliverFilesToChannel,
  channelDropsFilesNotice,
  buildNativeSharePayload,
  buildOpenGraphShareUrl,
  buildShareText,
  channelNeedsClipboardFirst,
  isShareAbortError,
  pickNativeShareableFiles,
  prefersNativeWebShare,
} from "../src/lib/shareActions";

describe("buildShareText", () => {
  test("membagikan caption saja tanpa menambahkan tautan", () => {
    expect(buildShareText("  Honda Mobilio\nTDP 20jt  ")).toBe("Honda Mobilio\nTDP 20jt");
    expect(buildShareText("  ")).toBe("");
  });
});

describe("buildChannelShareUrl", () => {
  const caption = "Honda Mobilio\nTDP 20jt";

  for (const channel of ["wa", "x", "threads"] as const) {
    test(`${channel} hanya mengirim caption tanpa URL situs`, () => {
      const url = new URL(buildChannelShareUrl(channel, caption));
      expect(url.searchParams.get("text")).toBe(caption);
      expect(url.searchParams.has("url")).toBe(false);
      expect(url.searchParams.has("u")).toBe(false);
      expect(channelNeedsClipboardFirst(channel)).toBe(false);
    });
  }

  for (const [channel, destination] of [
    ["fb", "https://www.facebook.com/"],
    ["tg", "https://web.telegram.org/"],
    ["ig", "https://www.instagram.com/"],
    ["tt", "https://www.tiktok.com/"],
  ] as const) {
    test(`${channel} membuka aplikasi dengan caption melalui clipboard`, () => {
      expect(buildChannelShareUrl(channel, caption)).toBe(destination);
      expect(channelNeedsClipboardFirst(channel)).toBe(true);
    });
  }

  test("buildOpenGraphShareUrl tetap tersedia untuk preview halaman", () => {
    expect(buildOpenGraphShareUrl("https://agenmobix.id/share?u=toyota-calya-2019")).toBe(
      "https://agentmobix-api.margi-landshark.workers.dev/og?u=toyota-calya-2019",
    );
  });
});

describe("prefersNativeWebShare", () => {
  test("is false when navigator.share is missing", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = { userAgent: "iPhone", maxTouchPoints: 5 };
    try {
      expect(prefersNativeWebShare()).toBe(false);
    } finally {
      globalThis.navigator = original;
    }
  });

  test("is true for touch devices with navigator.share", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      maxTouchPoints: 5,
      userAgent: "Mozilla/5.0",
    };
    try {
      expect(prefersNativeWebShare()).toBe(true);
    } finally {
      globalThis.navigator = original;
    }
  });

  test("is false for desktop without touch even if share exists", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      maxTouchPoints: 0,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    };
    try {
      expect(prefersNativeWebShare()).toBe(false);
    } finally {
      globalThis.navigator = original;
    }
  });
});

describe("buildNativeSharePayload", () => {
  test("returns null when navigator.share is unavailable", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = {};
    try {
      expect(buildNativeSharePayload([], "Title", "Body")).toBeNull();
    } finally {
      globalThis.navigator = original;
    }
  });

  test("builds text-only payload without a separate url field", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
    };
    try {
      expect(buildNativeSharePayload([], "Title", "Caption body")).toEqual({
        title: "Title",
        text: "Caption body",
      });
    } finally {
      globalThis.navigator = original;
    }
  });

  test("prefers files+text when canShare accepts it", () => {
    const original = globalThis.navigator;
    const file = new File(["x"], "unit.jpg", { type: "image/jpeg" });
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      canShare: (data: ShareData) => Boolean(data.files?.length && data.text),
    };
    try {
      expect(buildNativeSharePayload([file], "Title", "Caption")).toEqual({
        files: [file],
        title: "Title",
        text: "Caption",
      });
    } finally {
      globalThis.navigator = original;
    }
  });

  test("falls back to files-only when text is rejected", () => {
    const original = globalThis.navigator;
    const file = new File(["x"], "unit.jpg", { type: "image/jpeg" });
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      canShare: (data: ShareData) => Boolean(data.files?.length) && !data.text,
    };
    try {
      expect(buildNativeSharePayload([file], "Title", "Caption")).toEqual({
        files: [file],
        title: "Title",
      });
    } finally {
      globalThis.navigator = original;
    }
  });
});

describe("isShareAbortError", () => {
  test("detects AbortError from cancelled native share", () => {
    expect(isShareAbortError(Object.assign(new Error("cancel"), { name: "AbortError" }))).toBe(
      true,
    );
    expect(isShareAbortError(new Error("other"))).toBe(false);
  });
});

describe("pickNativeShareableFiles", () => {
  test("returns largest batch that canShare accepts", () => {
    const original = globalThis.navigator;
    const files = [1, 2, 3, 4, 5, 6].map(
      (n) => new File([`x${n}`], `unit-${n}.jpg`, { type: "image/jpeg" }),
    );
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      canShare: (data: ShareData) => (data.files?.length ?? 0) <= 3,
    };
    try {
      const picked = pickNativeShareableFiles(files, "T", "caption");
      expect(picked).toHaveLength(3);
      expect(picked[0].name).toBe("unit-1.jpg");
    } finally {
      globalThis.navigator = original;
    }
  });

  test("falls back to single file when multi-file is rejected", () => {
    const original = globalThis.navigator;
    const files = [1, 2, 3].map(
      (n) => new File([`x${n}`], `unit-${n}.jpg`, { type: "image/jpeg" }),
    );
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      canShare: (data: ShareData) => (data.files?.length ?? 0) === 1,
    };
    try {
      expect(pickNativeShareableFiles(files, "T", "c")).toHaveLength(1);
    } finally {
      globalThis.navigator = original;
    }
  });
});

describe("canDeliverFilesToChannel", () => {
  const file = new File(["x"], "unit.jpg", { type: "image/jpeg" });

  test("false tanpa file — tidak ada media untuk dikirim", () => {
    expect(canDeliverFilesToChannel([])).toBe(false);
  });

  test("false saat browser menolak share file (web intent hanya teks)", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      canShare: () => false,
    };
    try {
      expect(canDeliverFilesToChannel([file])).toBe(false);
    } finally {
      globalThis.navigator = original;
    }
  });

  test("true saat browser sanggup melampirkan file lewat sheet native", () => {
    const original = globalThis.navigator;
    // @ts-expect-error test stub
    globalThis.navigator = {
      share: async () => {},
      canShare: (data: ShareData) => Boolean(data.files?.length),
    };
    try {
      expect(canDeliverFilesToChannel([file])).toBe(true);
    } finally {
      globalThis.navigator = original;
    }
  });
});

describe("channelDropsFilesNotice", () => {
  test("kosong saat tidak ada media", () => {
    expect(channelDropsFilesNotice("wa", 0)).toBe("");
  });

  test("WhatsApp: sebut foto tidak ikut dan media sudah diunduh", () => {
    const notice = channelDropsFilesNotice("wa", 1);
    expect(notice).toContain("WhatsApp");
    expect(notice).toContain("diunduh");
    expect(notice.startsWith("Foto")).toBe(true);
  });

  test("jamak memakai jumlah media", () => {
    expect(channelDropsFilesNotice("wa", 3)).toContain("3 media");
  });

  test("channel lain tetap memberi peringatan yang sama jelasnya", () => {
    const notice = channelDropsFilesNotice("x", 2);
    expect(notice).toContain("2 media");
    expect(notice).toContain("diunduh");
  });
});
