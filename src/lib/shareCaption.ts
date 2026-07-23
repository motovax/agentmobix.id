export interface RequiredCaptionFact {
  line: string;
  matches?: string[];
}

export interface RequiredCaptionSection {
  heading: string;
  facts: RequiredCaptionFact[];
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
