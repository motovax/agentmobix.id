/**
 * Helpers for social share: device detection, clipboard, channel URLs,
 * and Web Share API capability checks.
 */

export type ShareChannel =
  | "wa"
  | "wa-web"
  | "tg"
  | "x"
  | "fb"
  | "ig"
  | "threads"
  | "tt";

/** Cloudflare Worker endpoint that serves per-unit Open Graph HTML for crawlers. */
export const OPEN_GRAPH_SHARE_BASE =
  "https://agentmobix-api.margi-landshark.workers.dev/og";

/**
 * Facebook (and other link scrapers) need server-rendered og: meta.
 * Map a unit share/unit URL (or raw slug) to the OG preview URL.
 */
export function buildOpenGraphShareUrl(unitLinkOrSlug: string): string {
  let slug = (unitLinkOrSlug || "").trim();
  if (!slug) {
    return `${OPEN_GRAPH_SHARE_BASE}`;
  }
  try {
    if (slug.includes("://") || slug.startsWith("/") || slug.includes("?")) {
      const parsed = new URL(slug, "https://agenmobix.id");
      const fromQuery = parsed.searchParams.get("u");
      if (fromQuery) {
        slug = fromQuery;
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);
        const unitIdx = parts.indexOf("unit");
        slug = unitIdx >= 0 && parts[unitIdx + 1] ? parts[unitIdx + 1] : parts.at(-1) || slug;
      }
    }
  } catch {
    /* keep slug as-is */
  }
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep */
  }
  return `${OPEN_GRAPH_SHARE_BASE}?u=${encodeURIComponent(slug)}`;
}

/** Caption siap dibagikan tanpa menambahkan tautan situs atau media. */
export function buildShareText(caption: string): string {
  return caption.trim();
}

/**
 * Prefer native system share sheet on phones/tablets (touch or mobile UA).
 * Desktop browsers often expose navigator.share with poor UX — use channel picker.
 */
export function prefersNativeWebShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0) {
    return true;
  }
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || "",
  );
}

export function canWebShareFiles(files: File[]): boolean {
  if (files.length === 0) return false;
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Build a ShareData payload that target apps are most likely to accept.
 * Avoid a top-level `url` field when sharing files — many Android apps then
 * drop the caption and only keep the page URL.
 */
export function buildNativeSharePayload(
  files: File[],
  title: string,
  text: string,
): ShareData | null {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return null;
  }

  const withFilesAndText: ShareData = {
    files,
    title,
    ...(text ? { text } : {}),
  };
  const filesOnly: ShareData = { files, title };
  const textOnly: ShareData = {
    title,
    ...(text ? { text } : {}),
  };

  if (files.length > 0 && typeof navigator.canShare === "function") {
    try {
      if (navigator.canShare(withFilesAndText)) return withFilesAndText;
      if (navigator.canShare(filesOnly)) return filesOnly;
    } catch {
      /* fall through */
    }
    return null;
  }

  if (files.length > 0) {
    // canShare missing: still try files+text (Safari older); caller should catch.
    return withFilesAndText;
  }

  if (!text && !title) return null;
  return textOnly;
}

/**
 * Many phones reject large multi-file shares (canShare false or share() throws).
 * Pick the largest prefix of `files` that canShare accepts (sync — keep user gesture).
 * Order: all → 5 → 3 → 1.
 */
export function pickNativeShareableFiles(
  files: File[],
  title: string,
  text: string,
): File[] {
  if (files.length === 0) return [];

  const sizes = Array.from(
    new Set([files.length, 5, 3, 1].filter((n) => n > 0 && n <= files.length)),
  ).sort((a, b) => b - a);

  for (const size of sizes) {
    const batch = files.slice(0, size);
    if (buildNativeSharePayload(batch, title, text)) {
      return batch;
    }
  }

  // Last resort: single file even if canShare is picky (caller may still fail).
  return files.slice(0, 1);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* try legacy fallback */
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.width = "1px";
    area.style.height = "1px";
    area.style.padding = "0";
    area.style.border = "none";
    area.style.outline = "none";
    area.style.boxShadow = "none";
    area.style.background = "transparent";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Facebook / Telegram require a link for web sharing; use clipboard instead.
 * Instagram / TikTok have no public web intent that pre-fills a post caption.
 * Caller should copy caption first, then open the app/site.
 */
export function channelNeedsClipboardFirst(channel: ShareChannel): boolean {
  return channel === "ig" || channel === "tt" || channel === "fb" || channel === "tg";
}

/**
 * Web intent channel URLs (wa.me, x.com/intent, threads) can only carry text —
 * a photo never rides along. When files are ready and the browser can share
 * them, the native sheet is the only path that actually attaches the photo.
 */
export function canDeliverFilesToChannel(files: File[]): boolean {
  return files.length > 0 && canWebShareFiles(files);
}

/**
 * Warning copy for channels that will receive caption only.
 * Agents kept reporting "foto tidak ikut keshare" because the web intent
 * silently drops files; say it out loud and point at the download button.
 */
export function channelDropsFilesNotice(
  channel: ShareChannel,
  fileCount: number,
): string {
  if (fileCount === 0) return "";
  const media = fileCount > 1 ? `${fileCount} media` : "Foto";
  if (channel === "wa-web") {
    return `Caption sudah dikirim ke WhatsApp Web. ${media} sudah diunduh — lanjutkan dengan melampirkannya di chat yang sama.`;
  }
  if (channel === "wa") {
    return `${media} tidak bisa ikut lewat tautan WhatsApp web. Media sudah diunduh — lampirkan manual di chat WhatsApp.`;
  }
  return `${media} tidak bisa ikut lewat tautan ${channel.toUpperCase()}. Media sudah diunduh — lampirkan manual.`;
}

/** Deep links / web intents for channel picker fallback. */
export function buildChannelShareUrl(
  channel: ShareChannel,
  caption: string,
): string {
  const text = buildShareText(caption);
  const encodedText = encodeURIComponent(text);

  switch (channel) {
    case "wa":
      return `https://wa.me/?text=${encodedText}`;
    case "wa-web":
      // Desktop: paksa WhatsApp Web (bukan deep link ke app) dengan caption terisi.
      return `https://web.whatsapp.com/send?text=${encodedText}`;
    case "tg":
      return "https://web.telegram.org/";
    case "x":
      return `https://x.com/intent/tweet?text=${encodedText}`;
    case "fb":
      return "https://www.facebook.com/";
    case "ig":
      // No prefilled caption intent — open Instagram; paste from clipboard.
      return "https://www.instagram.com/";
    case "tt":
      // No prefilled caption intent — open TikTok; paste caption after upload.
      return "https://www.tiktok.com/";
    case "threads":
      return `https://www.threads.net/intent/post?text=${encodedText}`;
    default:
      return `https://wa.me/?text=${encodedText}`;
  }
}

export function isShareAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}
