/**
 * Helpers for social share: device detection, clipboard, channel URLs,
 * and Web Share API capability checks.
 */

export type ShareChannel = "wa" | "tg" | "x";

/** Caption + unit link ready to paste into chat apps. */
export function buildShareText(caption: string, link: string): string {
  const body = caption.trim();
  const url = link.trim();
  if (!body) return url;
  if (!url) return body;
  if (body.includes(url)) return body;
  return `${body}\n\n${url}`;
}

/**
 * Prefer native Web Share on touch / mobile UAs. Desktop browsers often expose
 * navigator.share but give a poor or empty UX — use the channel picker there.
 */
export function prefersNativeWebShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0) {
    return true;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
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

/** Deep links for WhatsApp / Telegram / X with caption + unit URL. */
export function buildChannelShareUrl(
  channel: ShareChannel,
  caption: string,
  link: string,
): string {
  const text = buildShareText(caption, link);
  const encodedText = encodeURIComponent(text);
  const encodedLink = encodeURIComponent(link.trim() || "https://agenmobix.id");
  const encodedCaption = encodeURIComponent(caption.trim() || text);

  switch (channel) {
    case "wa":
      return `https://wa.me/?text=${encodedText}`;
    case "tg":
      // Telegram expects a real URL in `url` and optional caption in `text`.
      return `https://t.me/share/url?url=${encodedLink}&text=${encodedCaption}`;
    case "x":
      return `https://x.com/intent/tweet?text=${encodedText}`;
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
