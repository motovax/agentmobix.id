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

export type FalconConversationTurn = {
  role: "user" | "assistant";
  content: string;
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

export type FalconTurnResult = {
  conversation: FalconConversationTurn[];
  html: string;
  reply: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function formatFalconLine(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
}

function normalizedPlate(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

const MAX_FALCON_CONTEXT_TURNS = 6;
const MAX_FALCON_CONTEXT_CHARACTERS = 8_000;

/**
 * Falcon's external endpoint is stateless, so follow-up requests must carry
 * enough of the preceding conversation to resolve phrases such as "buatkan".
 */
export function buildFalconContextMessage(
  message: string,
  conversation: FalconConversationTurn[],
) {
  if (conversation.length === 0) return message;

  const recentConversation = conversation.slice(-MAX_FALCON_CONTEXT_TURNS);
  const lines: string[] = [];
  let usedCharacters = 0;

  for (let index = recentConversation.length - 1; index >= 0; index -= 1) {
    const turn = recentConversation[index];
    const label = turn.role === "user" ? "Pengguna" : "AI Mobix Assistant";
    const line = `${label}: ${turn.content.trim()}`;
    if (usedCharacters + line.length > MAX_FALCON_CONTEXT_CHARACTERS) break;
    lines.unshift(line);
    usedCharacters += line.length;
  }

  return [
    "Lanjutkan percakapan berdasarkan riwayat berikut.",
    "Pertahankan unit, plat nomor, dan kebutuhan yang sudah disebut. Jangan tanyakan ulang informasi yang sudah ada di riwayat.",
    "Jika pengguna meminta simulasi atau berkata singkat seperti 'buatkan', gunakan plat nomor unit terakhir dari riwayat.",
    "",
    ...lines,
    `Pengguna: ${message}`,
    "AI Mobix Assistant:",
  ].join("\n");
}

/** Render Falcon markdown and place each resolved URL after its recommendation details. */
export function formatFalconReplyHtml(reply: string, units: FalconUnitLink[] = []) {
  const lines = reply.split("\n");
  const linksAfterLine = new Map<number, FalconUnitLink>();

  lines.forEach((line, index) => {
    const reference = extractFalconUnitReferences(line)[0];
    const unit = reference
      ? units.find(({ plateNo }) => normalizedPlate(plateNo) === reference.plateNo)
      : undefined;
    if (!unit) return;

    let endOfUnit = index;
    while (
      endOfUnit + 1 < lines.length
      && lines[endOfUnit + 1].trim() !== ""
      && extractFalconUnitReferences(lines[endOfUnit + 1]).length === 0
    ) {
      endOfUnit += 1;
    }
    linksAfterLine.set(endOfUnit, unit);
  });

  return lines.map((line, index) => {
    const formattedLine = formatFalconLine(line);
    const unit = linksAfterLine.get(index);

    if (!unit) return formattedLine;

    const href = escapeHtml(unit.href);
    return `${formattedLine}<br/><a href="${href}" data-ai-unit-link="true" target="_blank" rel="noreferrer" class="break-all text-[11px] font-normal text-teal-deep underline">${href}</a>`;
  }).join("<br/>");
}

type FalconStreamPayload = {
  answer?: string;
  content?: string;
  reply?: string;
  text?: string;
  delta?: string;
  message?: string;
  error?: string;
};

/** Parse one SSE event, including CRLF and multi-line data fields. */
export function parseFalconSseFrame(frame: string): {
  event: string;
  payload?: FalconStreamPayload;
} {
  let event = "message";
  const data: string[] = [];
  for (const line of frame.replace(/\r/g, "").split("\n")) {
    if (line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = (separator === -1 ? "" : line.slice(separator + 1)).replace(/^ /, "");
    if (field === "event") event = value;
    if (field === "data") data.push(value);
  }
  if (data.length === 0) return { event };
  const raw = data.join("\n");
  try {
    return { event, payload: JSON.parse(raw) as FalconStreamPayload };
  } catch {
    return { event, payload: { message: raw } };
  }
}

function streamText(payload: FalconStreamPayload) {
  return payload.answer ?? payload.content ?? payload.reply ?? payload.text ?? payload.delta ?? "";
}

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

  const detailTitle = reply.match(/^\s*(?:\*{1,2})?DETAIL UNIT\s+([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})\s+[—-]\s+(.+?)(?:\*{1,2})?\s*$/im);
  const labelledPlate = reply.match(/(?:Plat(?:\s+Nomor)?|Nomor\s+Polisi)\s*:\s*([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})/i);
  if (labelledPlate) {
    const plateNo = labelledPlate[1].replace(/\s+/g, "").toUpperCase();
    if (!seen.has(plateNo)) {
      seen.add(plateNo);
      references.push({
        title: detailTitle?.[2].replace(/\*+/g, "").trim() || `Unit ${plateNo}`,
        plateNo,
      });
    }
  }

  return references;
}

function asksForKnownPlate(reply: string, conversation: FalconConversationTurn[]) {
  const knownPlate = extractFalconUnitReferences(
    conversation.map(({ content }) => content).join("\n"),
  )[0]?.plateNo;
  if (!knownPlate) return false;

  return /(?:plat(?:\s+nomor)?|nomor\s+polisi)[^.!?\n]{0,80}(?:berapa|sebutkan|masukkan|informasikan|kirimkan|yang mana)/i.test(reply)
    || /(?:berapa|sebutkan|masukkan|informasikan|kirimkan)[^.!?\n]{0,80}(?:plat(?:\s+nomor)?|nomor\s+polisi)/i.test(reply);
}

/** Jalankan satu giliran percakapan AI beserta resolusi tautan detail unit. */
export async function executeFalconTurn(
  message: string,
  conversation: FalconConversationTurn[],
  dependencies: {
    ask?: typeof askFalcon;
    resolveLinks?: typeof resolveFalconUnitLinks;
  } = {},
): Promise<FalconTurnResult> {
  const ask = dependencies.ask ?? askFalcon;
  const resolveLinks = dependencies.resolveLinks ?? resolveFalconUnitLinks;
  const contextMessage = buildFalconContextMessage(message, conversation);
  let { reply } = await ask(contextMessage);

  if (asksForKnownPlate(reply, conversation)) {
    const knownPlate = extractFalconUnitReferences(
      conversation.map(({ content }) => content).join("\n"),
    )[0]?.plateNo;
    ({ reply } = await ask([
      contextMessage,
      "",
      `Koreksi: plat nomor unit sudah diketahui, yaitu ${knownPlate}.`,
      "Jawab permintaan pengguna sekarang tanpa meminta plat nomor lagi.",
    ].join("\n")));
  }

  const units = await resolveLinks(reply);
  return {
    reply,
    html: formatFalconReplyHtml(reply, units),
    conversation: [
      ...conversation,
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ],
  };
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
    const frames = buffer.replace(/\r\n/g, "\n").split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const parsed = parseFalconSseFrame(frame);
      if (!parsed.payload) continue;
      if (parsed.event === "error") {
        throw new Error(parsed.payload.message || parsed.payload.error || "Falcon gagal menjawab");
      }
      const text = streamText(parsed.payload);
      if (text) answer += text;
    }
  }
  if (buffer.trim()) {
    const parsed = parseFalconSseFrame(buffer);
    if (parsed.event === "error") {
      throw new Error(parsed.payload?.message || parsed.payload?.error || "Falcon gagal menjawab");
    }
    answer += streamText(parsed.payload ?? {});
  }
  if (!answer) throw new Error("Falcon mengirim jawaban kosong");
  return { reply: answer };
}
