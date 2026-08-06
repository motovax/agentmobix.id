const FALCON_API_BASE = (
  import.meta.env.VITE_FALCON_API_BASE || "https://motovax-ai.motovax.com"
).replace(/\/$/, "");
const FALCON_DEMO_SLUG = import.meta.env.VITE_FALCON_DEMO_SLUG || "motovax-ai";
const SESSION_STORAGE_KEY = "mobix-falcon-session-id";

export type FalconPhoto = {
  url: string;
  label?: string;
};

export type FalconReply = {
  reply: string;
  photos?: FalconPhoto[];
};

function sessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const value = `mobix-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
  return value;
}

export async function askFalcon(message: string): Promise<FalconReply> {
  const response = await fetch(
    `${FALCON_API_BASE}/api/public/demo/${encodeURIComponent(FALCON_DEMO_SLUG)}/falcon-chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: sessionId(), role: "sales", message }),
    },
  );

  if (!response.ok) {
    throw new Error("Falcon sedang tidak dapat diakses");
  }

  const payload = await response.json() as FalconReply;
  if (!payload.reply?.trim()) throw new Error("Falcon mengirim jawaban kosong");
  return payload;
}
