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
