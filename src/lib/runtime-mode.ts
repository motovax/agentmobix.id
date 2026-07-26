const DEFAULT_AGENT_USER_AGENT_TOKENS = "AgenMobix,AgentMobix";

export function isAgentUserAgent(
  userAgent: string,
  configuredTokens: string = String(
    import.meta.env.VITE_AGENT_USER_AGENT_TOKENS ||
      import.meta.env.VITE_AGENT_USER_AGENT_TOKEN ||
      DEFAULT_AGENT_USER_AGENT_TOKENS,
  ),
) {
  const normalizedUserAgent = userAgent.toLowerCase();
  return configuredTokens
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => normalizedUserAgent.includes(token));
}
