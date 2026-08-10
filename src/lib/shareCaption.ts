export interface RequiredCaptionFact {
  line: string;
  matches?: string[];
}

export interface RequiredCaptionSection {
  heading: string;
  facts: RequiredCaptionFact[];
}

/** Fixed sales hook di depan caption share. */
export const CAPTION_HOOK_PREFIX = "Dijual cepat unit istimewa";

/** CTA penutup caption share. */
export const CAPTION_CTA = "tertarik bisa langsung DM ya.";

export function buildAgenMobixUnitLink(slug?: string | null) {
  const normalizedSlug = slug?.trim();
  return normalizedSlug
    ? `https://agenmobix.id/share?u=${encodeURIComponent(normalizedSlug)}`
    : "https://agenmobix.id";
}

export function buildMobixByDssUnitLink(slug?: string | null) {
  const normalizedSlug = slug?.trim();
  return normalizedSlug
    ? `https://mobixbydss.id/produk/detail/${encodeURIComponent(normalizedSlug)}`
    : "https://mobixbydss.id";
}

/**
 * Pastikan caption diawali prefix kanonis (tanpa mendobel jika sudah ada).
 */
export function ensureCaptionPrefix(
  caption: string,
  prefix: string = CAPTION_HOOK_PREFIX,
) {
  const trimmed = caption.trim();
  if (!trimmed) return prefix;

  const lines = trimmed.split(/\n+/);
  const first = (lines[0] ?? "").trim();
  const firstNorm = first.toLocaleLowerCase("id-ID");
  const prefixNorm = prefix.toLocaleLowerCase("id-ID");

  if (firstNorm === prefixNorm || firstNorm.startsWith(prefixNorm)) {
    const rest = lines.slice(1).join("\n").trim();
    return rest ? `${prefix}\n\n${rest}` : prefix;
  }

  return `${prefix}\n\n${trimmed}`;
}

const TRAILING_CTA_RE =
  /(?:\n{1,2})?(?:chat saya(?:\s+ya)?[^.!\n]*[.!]?|tertarik bisa langsung dm(?:\s+ya)?[.!]?|minat\?[^.!\n]*[.!]?|mau saya bantu[^.!\n]*[.!]?|langsung chat saya[^.!\n]*[.!]?)\s*$/i;

/**
 * Pastikan caption diakhiri CTA kanonis; ganti CTA lama yang mirip.
 */
export function ensureCaptionCta(
  caption: string,
  cta: string = CAPTION_CTA,
) {
  const trimmed = caption.trim();
  if (!trimmed) return cta;

  const withoutOld = trimmed.replace(TRAILING_CTA_RE, "").trim();
  const ctaNorm = cta.toLocaleLowerCase("id-ID");
  if (withoutOld.toLocaleLowerCase("id-ID").endsWith(ctaNorm)) {
    return withoutOld;
  }
  return `${withoutOld}\n\n${cta}`;
}

/** Susun caption default: prefix + body + CTA. */
export function buildShareAutoCaption(
  bodyParts: Array<string | null | undefined | false>,
) {
  const body = bodyParts.filter(Boolean).join("\n\n");
  return ensureCaptionCta(ensureCaptionPrefix(body));
}

/**
 * WhatsApp click-to-chat tidak dapat menerima attachment dari query string.
 * Menyertakan URL foto di teks tetap memungkinkan WhatsApp membuat link preview.
 */
export function buildWhatsAppShareText(caption: string, imageUrls: string[] = []) {
  const urls = [...new Set(imageUrls.map((url) => url.trim()).filter(Boolean))];
  if (urls.length === 0) return caption.trim();
  return [caption.trim(), "Foto unit:", ...urls].filter(Boolean).join("\n\n");
}

function normalizeCaptionValue(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeCaptionWords(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function formatCaptionReadability(caption: string) {
  const paragraphs = caption
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.join("\n\n");

  const singleParagraph = paragraphs[0] ?? "";
  return singleParagraph.replace(/([.!?])\s+(?=[A-Z])/g, "$1\n\n");
}

export function removeCaptionParagraphsContaining(
  caption: string,
  protectedTerms: string[],
) {
  const normalizedTerms = protectedTerms
    .map(normalizeCaptionWords)
    .filter(Boolean);
  return caption
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => {
      const normalizedParagraph = ` ${normalizeCaptionWords(paragraph)} `;
      return !normalizedTerms.some((term) => normalizedParagraph.includes(` ${term} `));
    })
    .join("\n\n");
}

function captionHasFact(caption: string, fact: RequiredCaptionFact) {
  const normalizedCaption = normalizeCaptionValue(caption);
  const matches = fact.matches?.length ? fact.matches : [fact.line];
  return matches.some((match) => {
    const normalizedMatch = normalizeCaptionValue(match);
    return normalizedMatch !== "" && normalizedCaption.includes(normalizedMatch);
  });
}

/**
 * Appends only facts omitted by an AI-generated caption. The facts remain
 * deterministic even when the AI rewrites the surrounding sales copy.
 */
export function ensureRequiredCaptionFacts(
  caption: string,
  sections: RequiredCaptionSection[],
) {
  const baseCaption = caption.trim();
  const missingSections = sections.flatMap((section) => {
    const missingFacts = section.facts.filter((fact) => !captionHasFact(baseCaption, fact));
    if (missingFacts.length === 0) return [];
    return [
      [
        section.heading,
        ...missingFacts.map((fact) => `• ${fact.line}`),
      ].join("\n"),
    ];
  });

  return [baseCaption, ...missingSections].filter(Boolean).join("\n\n");
}
