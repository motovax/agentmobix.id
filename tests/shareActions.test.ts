import { describe, expect, test } from "bun:test";
import {
  buildChannelShareUrl,
  buildNativeSharePayload,
  buildShareText,
  channelNeedsClipboardFirst,
  isShareAbortError,
  prefersNativeWebShare,
} from "../src/lib/shareActions";

describe("buildShareText", () => {
  test("joins caption and link with a blank line", () => {
    expect(buildShareText("Halo unit bagus", "https://agenmobix.id/unit/a")).toBe(
      "Halo unit bagus\n\nhttps://agenmobix.id/unit/a",
    );
  });

  test("does not duplicate an already-included link", () => {
    const caption = "Cek unit\n\nhttps://agenmobix.id/unit/a";
    expect(buildShareText(caption, "https://agenmobix.id/unit/a")).toBe(caption);
  });

  test("falls back to whichever side is present", () => {
    expect(buildShareText("", "https://agenmobix.id/unit/a")).toBe(
      "https://agenmobix.id/unit/a",
    );
    expect(buildShareText("Caption saja", "")).toBe("Caption saja");
  });
});

describe("buildChannelShareUrl", () => {
  const caption = "Honda Mobilio\nTDP 20jt";
  const link = "https://agenmobix.id/unit/honda-mobilio";

  test("WhatsApp embeds full caption + link in text", () => {
    const url = buildChannelShareUrl("wa", caption, link);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1] ?? "");
    expect(text).toContain("Honda Mobilio");
    expect(text).toContain(link);
  });

  test("Telegram uses real unit URL and caption as text", () => {
    const url = buildChannelShareUrl("tg", caption, link);
    expect(url.startsWith("https://t.me/share/url?")).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("url")).toBe(link);
    expect(params.get("text")).toBe(caption);
  });

  test("X / Twitter embeds full caption + link in text", () => {
    const url = buildChannelShareUrl("x", caption, link);
    expect(url.startsWith("https://x.com/intent/tweet?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1] ?? "");
    expect(text).toContain("Honda Mobilio");
    expect(text).toContain(link);
  });

  test("Facebook sharer uses unit URL and quote caption", () => {
    const url = buildChannelShareUrl("fb", caption, link);
    expect(url.startsWith("https://www.facebook.com/sharer/sharer.php?")).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("u")).toBe(link);
    expect(params.get("quote")).toBe(caption);
  });

  test("Instagram opens app/site (caption via clipboard first)", () => {
    expect(buildChannelShareUrl("ig", caption, link)).toBe("https://www.instagram.com/");
    expect(channelNeedsClipboardFirst("ig")).toBe(true);
    expect(channelNeedsClipboardFirst("wa")).toBe(false);
  });

  test("Threads intent embeds full caption + link", () => {
    const url = buildChannelShareUrl("threads", caption, link);
    expect(url.startsWith("https://www.threads.net/intent/post?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1] ?? "");
    expect(text).toContain("Honda Mobilio");
    expect(text).toContain(link);
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
