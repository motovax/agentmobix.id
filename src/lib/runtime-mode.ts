const DEFAULT_AGENT_USER_AGENT_TOKEN = "AgenMobix";

export function isAgentUserAgent(
  userAgent: string,
  token = import.meta.env.VITE_AGENT_USER_AGENT_TOKEN ||
    DEFAULT_AGENT_USER_AGENT_TOKEN,
) {
  const normalizedToken = token.trim().toLowerCase();
  if (!normalizedToken) return false;
  return userAgent.toLowerCase().includes(normalizedToken);
}
