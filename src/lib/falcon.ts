import { fetchUnits } from "./mobix";
import { buildAgenMobixUnitLink } from "./shareCaption";

const FALCON_API_BASE = (
  import.meta.env.VITE_FALCON_API_BASE || "https://motovax-ai.motovax.com"
).replace(/\/$/, "");
const FALCON_SSE_URL = (
  import.meta.env.VITE_FALCON_SSE_URL || `${FALCON_API_BASE}/api/falcon/external/stream`
).replace(/\/$/, "");
const FALCON_CLIENT = import.meta.env.VITE_FALCON_CLIENT || "mobix";
const FALCON_TOKEN = import.meta.env.VITE_FALCON_TOKEN || "";

export type FalconReply = {
  reply: string;
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

export async function askFalcon(message: string): Promise<FalconReply> {
  if (!FALCON_TOKEN) throw new Error("Falcon Mobix belum dikonfigurasi");
  const response = await fetch(FALCON_SSE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FALCON_TOKEN}`,
      "X-Falcon-Client": FALCON_CLIENT,
      "content-type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ client_id: FALCON_CLIENT, message }),
  });

  if (!response.ok) throw new Error(await response.text() || "Falcon sedang tidak dapat diakses");
  if (!response.body) throw new Error("Falcon tidak mengembalikan stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const event = frame.match(/^event: (.+)$/m)?.[1];
      const data = frame.match(/^data: (.+)$/m)?.[1];
      if (!data) continue;
      const payload = JSON.parse(data) as { answer?: string; message?: string };
      if (event === "message") answer = payload.answer?.trim() || "";
      if (event === "error") throw new Error(payload.message || "Falcon gagal menjawab");
    }
  }
  if (!answer) throw new Error("Falcon mengirim jawaban kosong");
  return { reply: answer };
}
