export const BASE_AGENT_COMMISSION = 2_000_000;
export const MIN_AGENT_COMMISSION = 1_000_000;
export const MAX_BUILDER_PRICE_DROP = 2_000_000;

export function minBuilderPrice(originalPrice: number): number {
  return Math.max(0, Math.round(originalPrice - MAX_BUILDER_PRICE_DROP));
}

export function clampBuilderPrice(value: number, originalPrice: number): number {
  if (!originalPrice) return Math.max(0, Math.round(value || 0));
  return Math.max(minBuilderPrice(originalPrice), Math.round(value || 0));
}

export function estimateBuilderCommission(
  originalPrice: number,
  builderPrice: number,
): number {
  if (!originalPrice || !builderPrice) return 0;
  return Math.max(
    MIN_AGENT_COMMISSION,
    Math.round(BASE_AGENT_COMMISSION + (builderPrice - originalPrice)),
  );
}
