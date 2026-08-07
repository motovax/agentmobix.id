import { fetchUnits, mobixImage } from "./mobix";
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
  imageSrc?: string;
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
export const MAX_FALCON_RECOMMENDATIONS = 5;

const FALCON_LIST_UNIT_PATTERN = /^\s*(?:\d+[.)]\s*)?(?:\*{1,2})?(.+?)\s+[—-]\s+([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})(?:\*{1,2})?\s*$/i;

function extractFalconListUnitReference(line: string): FalconUnitReference | null {
  const match = line.match(FALCON_LIST_UNIT_PATTERN);
  if (!match) return null;
  return {
    title: match[1].replace(/\*+/g, "").trim(),
    plateNo: normalizedPlate(match[2]),
  };
}

const PLATE_IN_TEXT_PATTERN = /\b([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})\b/i;

/**
 * Deteksi permintaan pencarian/detail unit (bukan simulasi kredit).
 * Saat true, AI harus jawab DETAIL UNIT + gambar dulu, lalu tanya simulasi.
 */
export function prefersUnitDetailFirst(message: string): boolean {
  const text = message.trim();
  if (!text) return false;

  const asksSimulation = /(?:buat(?:kan)?|hitung(?:kan)?|minta)\s+(?:simulasi|angsuran|cicilan|\bdp\b)|simulasi\s+kredit|berapa\s+(?:dp|angsuran|cicilan)/i
    .test(text);
  const asksUnitSearch = /cari\s*unit|detail\s*unit|info(?:rmasi)?\s*unit|lihat\s*unit|cek\s*unit/i
    .test(text);

  // "Cari unit X" selalu detail dulu, meski user juga sebut simulasi di kalimat yang sama.
  if (asksUnitSearch) return true;
  // Follow-up singkat seperti "buatkan" / "simulasi kredit" → boleh langsung simulasi.
  if (asksSimulation) return false;
  return false;
}

/** Balasan yang melompat ke angka kredit tanpa format DETAIL UNIT / daftar rekomendasi. */
export function looksLikeCreditSimulationOnlyReply(reply: string): boolean {
  if (/DETAIL\s+UNIT/i.test(reply)) return false;
  if (reply.split("\n").some((line) => extractFalconListUnitReference(line))) return false;

  const simulationSignals = [
    /\btotal\s*dp\b/i,
    /\bangsuran\b/i,
    /\bcicilan\b/i,
    /\btenor\b/i,
    /^\s*price\s*:/im,
  ];
  const hits = simulationSignals.filter((pattern) => pattern.test(reply)).length;
  return hits >= 2;
}

export function extractPlateFromMessage(message: string): string | null {
  // Prefer pola setelah "Cari unit:" / "unit" agar tidak menangkap kata lain.
  const afterLabel = message.match(
    /(?:cari\s*unit|detail\s*unit|unit)\s*[:\-]?\s*([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})\b/i,
  );
  if (afterLabel) return normalizedPlate(afterLabel[1]);

  const bare = message.trim().match(/^[A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3}$/i);
  if (bare) return normalizedPlate(bare[0]);

  const fallback = message.match(PLATE_IN_TEXT_PATTERN);
  return fallback ? normalizedPlate(fallback[1]) : null;
}

const UNIT_DETAIL_FIRST_GUIDANCE = [
  "Instruksi penting untuk pencarian unit:",
  "Pengguna sedang mencari unit, BUKAN meminta simulasi kredit.",
  "1. Jawab dengan DETAIL UNIT dulu (bukan angka DP/angsuran).",
  "2. Gunakan format baris pertama: DETAIL UNIT {PLAT} — {NAMA UNIT}",
  "3. Cantumkan minimal: Plat Nomor, Status, Harga cash, tahun, transmisi, odometer, bahan bakar, warna, cabang/lokasi.",
  "4. JANGAN menampilkan Total DP, Angsuran, Price kredit, tenor, atau hasil simulasi di jawaban ini.",
  "5. Tutup dengan menanyakan: \"Mau dibuatkan simulasi kredit untuk unit ini?\"",
].join("\n");

function withUnitDetailGuidance(contextMessage: string, message: string): string {
  if (!prefersUnitDetailFirst(message)) return contextMessage;
  const plate = extractPlateFromMessage(message);
  const plateHint = plate
    ? `\nPlat nomor yang dimaksud: ${plate}. Sertakan plat ini di header DETAIL UNIT dan baris Plat Nomor.`
    : "";
  return `${UNIT_DETAIL_FIRST_GUIDANCE}${plateHint}\n\n${contextMessage}`;
}

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
    "Jika pengguna mencari unit (bukan minta simulasi), jawab DETAIL UNIT dulu lalu tanyakan apakah mau simulasi kredit — jangan langsung simulasi.",
    "",
    ...lines,
    `Pengguna: ${message}`,
    "AI Mobix Assistant:",
  ].join("\n");
}

/** Render Falcon markdown and show at most five recommendations that have photos. */
export function formatFalconReplyHtml(reply: string, units: FalconUnitLink[] = []) {
  const lines = reply.split("\n");
  const linksAfterLine = new Map<number, FalconUnitLink>();
  const imagesBeforeLine = new Map<number, FalconUnitLink & { imageSrc: string }>();
  const hiddenLines = new Set<number>();
  const visibleUnits = units
    .filter((unit): unit is FalconUnitLink & { imageSrc: string } => Boolean(unit.imageSrc?.trim()))
    .slice(0, MAX_FALCON_RECOMMENDATIONS);
  const visibleByPlate = new Map(
    visibleUnits.map((unit) => [normalizedPlate(unit.plateNo), unit]),
  );
  let recommendationCount = 0;

  lines.forEach((line, index) => {
    const reference = extractFalconListUnitReference(line);
    if (!reference) return;
    recommendationCount += 1;

    let endOfUnit = index;
    while (
      endOfUnit + 1 < lines.length
      && lines[endOfUnit + 1].trim() !== ""
      && !extractFalconListUnitReference(lines[endOfUnit + 1])
    ) {
      endOfUnit += 1;
    }

    const unit = visibleByPlate.get(reference.plateNo);
    if (!unit) {
      for (let hiddenIndex = index; hiddenIndex <= endOfUnit; hiddenIndex += 1) {
        hiddenLines.add(hiddenIndex);
      }
      return;
    }

    imagesBeforeLine.set(index, unit);
    linksAfterLine.set(endOfUnit, unit);
  });

  // Detail responses use DETAIL UNIT / labelled plate instead of a recommendation
  // list heading. Attach photo + detail link once per plate for the whole block.
  const linkedDetailPlates = new Set<string>();
  lines.forEach((line, index) => {
    if (extractFalconListUnitReference(line) || hiddenLines.has(index)) return;
    const reference = extractFalconUnitReferences(line)[0];
    const unit = reference
      ? units.find(({ plateNo }) => normalizedPlate(plateNo) === reference.plateNo)
      : undefined;
    if (!unit || linkedDetailPlates.has(reference.plateNo)) return;
    linkedDetailPlates.add(reference.plateNo);

    let startOfUnit = index;
    // Naik ke baris DETAIL UNIT di blok yang sama agar gambar di atas detail.
    while (
      startOfUnit > 0
      && lines[startOfUnit - 1].trim() !== ""
      && !extractFalconListUnitReference(lines[startOfUnit - 1])
    ) {
      startOfUnit -= 1;
    }

    let endOfUnit = index;
    while (
      endOfUnit + 1 < lines.length
      && lines[endOfUnit + 1].trim() !== ""
      && !extractFalconListUnitReference(lines[endOfUnit + 1])
    ) {
      endOfUnit += 1;
    }

    if (unit.imageSrc?.trim()) {
      imagesBeforeLine.set(startOfUnit, { ...unit, imageSrc: unit.imageSrc });
    }
    linksAfterLine.set(endOfUnit, unit);
  });

  const formatted = lines.flatMap((line, index) => {
    if (hiddenLines.has(index)) return [];

    const formattedLine = formatFalconLine(line);
    const imageUnit = imagesBeforeLine.get(index);
    const unit = linksAfterLine.get(index);
    const imageHtml = imageUnit
      ? `<img src="${escapeHtml(imageUnit.imageSrc)}" alt="${escapeHtml(imageUnit.title)}" loading="lazy" class="mb-2 mt-1 h-32 w-full rounded-xl object-cover"/>`
      : "";

    if (!unit) return [`${imageHtml}${formattedLine}`];

    const href = escapeHtml(unit.href);
    return [`${imageHtml}${formattedLine}<br/><a href="${href}" data-ai-unit-link="true" target="_blank" rel="noreferrer" class="break-all text-[11px] font-normal text-teal-deep underline">${href}</a>`];
  });

  const compacted = formatted
    .filter((line, index, allLines) => line !== "" || allLines[index - 1] !== "")
    .join("<br/>")
    .replace(/^(?:<br\/>)+|(?:<br\/>)+$/g, "");

  if (recommendationCount > 0 && visibleUnits.length === 0) {
    const unavailableMessage = "Belum ada unit dengan foto yang sesuai.";
    return [compacted, unavailableMessage].filter(Boolean).join("<br/><br/>");
  }

  return compacted;
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
  for (const line of reply.split("\n")) {
    const reference = extractFalconListUnitReference(line);
    if (!reference) continue;
    const { plateNo } = reference;
    if (seen.has(plateNo)) continue;
    seen.add(plateNo);
    references.push(reference);
  }

  const detailTitle = reply.match(/^\s*(?:\*{1,2})?DETAIL UNIT\s+([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{0,3})\s+[—-]\s+(.+?)(?:\*{1,2})?\s*$/im);
  if (detailTitle) {
    const plateNo = normalizedPlate(detailTitle[1]);
    if (!seen.has(plateNo)) {
      seen.add(plateNo);
      references.push({
        title: detailTitle[2].replace(/\*+/g, "").trim() || `Unit ${plateNo}`,
        plateNo,
      });
    }
  }

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
  const baseContext = buildFalconContextMessage(message, conversation);
  const contextMessage = withUnitDetailGuidance(baseContext, message);
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

  // Cari unit harus detail dulu; koreksi jika model langsung ke simulasi kredit.
  if (prefersUnitDetailFirst(message) && looksLikeCreditSimulationOnlyReply(reply)) {
    const plate = extractPlateFromMessage(message)
      || extractFalconUnitReferences(
        conversation.map(({ content }) => content).join("\n"),
      )[0]?.plateNo;
    const plateLine = plate
      ? `Plat nomor unit: ${plate}.`
      : "Gunakan plat nomor unit yang disebut pengguna.";
    ({ reply } = await ask([
      contextMessage,
      "",
      "Koreksi: pengguna meminta detail unit, bukan simulasi kredit.",
      plateLine,
      "Jawab ulang dengan format DETAIL UNIT {PLAT} — {NAMA}.",
      "Cantumkan Plat Nomor, Status, Harga cash, dan spesifikasi utama.",
      "Jangan tampilkan Total DP, Angsuran, atau hasil simulasi sekarang.",
      "Tutup dengan menanyakan apakah mau dibuatkan simulasi kredit untuk unit ini.",
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

export async function resolveFalconUnitLinks(
  reply: string,
  dependencies: { fetch?: typeof fetchUnits } = {},
): Promise<FalconUnitLink[]> {
  const references = extractFalconUnitReferences(reply);
  const recommendationPlates = new Set(
    reply.split("\n")
      .map(extractFalconListUnitReference)
      .filter((reference): reference is FalconUnitReference => reference !== null)
      .map(({ plateNo }) => plateNo),
  );
  const fetchInventory = dependencies.fetch ?? fetchUnits;
  const resolved = await Promise.all(
    references.map(async (reference): Promise<FalconUnitLink | null> => {
      try {
        const result = await fetchInventory({ plate_no: reference.plateNo, limit: 5 });
        const item = result.items.find(
          (candidate) => candidate.plate_no.replace(/\s+/g, "").toUpperCase() === reference.plateNo,
        ) ?? result.items[0];
        if (!item?.slug) return null;
        const imageSrc = mobixImage(item.thumbnail_depan?.trim() || item.thumbnail?.trim());
        if (!imageSrc && recommendationPlates.has(reference.plateNo)) return null;
        return {
          slug: item.slug,
          title: item.nama || reference.title,
          plateNo: item.plate_no || reference.plateNo,
          href: buildAgenMobixUnitLink(item.slug),
          imageSrc,
        };
      } catch {
        return null;
      }
    }),
  );

  return resolved
    .filter((unit): unit is FalconUnitLink => unit !== null)
    .slice(0, MAX_FALCON_RECOMMENDATIONS);
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
