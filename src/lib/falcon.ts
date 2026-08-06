import { fetchUnits } from "./mobix";
import { buildAgenMobixUnitLink } from "./shareCaption";

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

export type FalconUnitLink = {
  slug: string;
  title: string;
  plateNo: string;
  href: string;
};

export type FalconUnitReference = {
  title: string;
  plateNo: string;
};

/**
 * Falcon currently returns inventory as formatted text. The plate number is
 * the stable identifier we can use to resolve the matching Mobix slug.
 */
export function extractFalconUnitReferences(reply: string): FalconUnitReference[] {
  const references: FalconUnitReference[] = [];
  const seen = new Set<string>();
  const linePattern = /^\s*(?:\d+[.)]\s*)?(?:\*{1,2})?(.+?)\s+[—-]\s+([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})(?:\*{1,2})?\s*$/gim;

  for (const match of reply.matchAll(linePattern)) {
    const plateNo = match[2].replace(/\s+/g, "").toUpperCase();
    if (seen.has(plateNo)) continue;
    seen.add(plateNo);
    references.push({ title: match[1].replace(/\*+/g, "").trim(), plateNo });
  }

  return references;
}

export async function resolveFalconUnitLinks(reply: string): Promise<FalconUnitLink[]> {
  const references = extractFalconUnitReferences(reply);
  const resolved = await Promise.all(
    references.map(async (reference) => {
      try {
        const result = await fetchUnits({ plate_no: reference.plateNo, limit: 5 });
        const item = result.items.find(
          (candidate) => candidate.plate_no.replace(/\s+/g, "").toUpperCase() === reference.plateNo,
        ) ?? result.items[0];
        if (!item?.slug) return null;
        return {
          slug: item.slug,
          title: item.nama || reference.title,
          plateNo: item.plate_no || reference.plateNo,
          href: buildAgenMobixUnitLink(item.slug),
        };
      } catch {
        return null;
      }
    }),
  );

  return resolved.filter((unit): unit is FalconUnitLink => unit !== null);
}

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
    throw new Error("Sparrow sedang tidak dapat diakses");
  }

  const payload = await response.json() as FalconReply;
  if (!payload.reply?.trim()) throw new Error("Sparrow mengirim jawaban kosong");
  return payload;
}
