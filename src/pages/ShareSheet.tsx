import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { AppShell } from "../components/AppShell";
import { ContactActionMenu } from "../components/FloatingContactCta";
import {
  CreditSimulationBox,
  type CreditSimulationResult,
} from "../components/CreditSimulationBox";
import { Photo, Skeleton } from "../components/ui";
import { UnitRow } from "../components/UnitRow";
import {
  ChevronLeft,
  ShareArrow,
  Download,
  Check,
  Close,
  Copy,
  Sparkles,
  Play,
  WhatsAppSolid,
  Telegram,
  XTwitter,
  FacebookSolid,
  InstagramSolid,
  Threads,
  TikTokSolid,
} from "../components/icons";
import {
  fetchUnitDetail,
  composeShareImageViaBackend,
  MOBIX_SHARE_WIDTH,
  mobixImage,
  mobixImageFetchableWithWidth,
  mobixMedia,
  mobixMediaFetchable,
  suggestShareCaption,
  generateAIBackground,
  fetchAIBackgroundStatus,
  prettyTransmisi,
  requiresSalesContact,
  titleCase,
  toCardUnit,
  type GalleryItem,
  type ProductDetail,
  type VideoItem,
  type AIBackgroundResponse,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatJt, formatOdometer, formatRupiah } from "../lib/format";
import {
  clampBuilderPrice,
  estimateBuilderCommission,
  minBuilderPrice,
} from "../lib/commission";
import { buildJasmineWhatsAppHref } from "../lib/jasmine";
import { getCatalogReturnHref } from "../lib/catalogSearch";
import {
  buildAgenMobixUnitLink,
  ensureRequiredCaptionFacts,
  formatCaptionReadability,
  removeCaptionParagraphsContaining,
  type RequiredCaptionSection,
} from "../lib/shareCaption";
import {
  buildChannelShareUrl,
  buildNativeSharePayload,
  buildShareText,
  channelNeedsClipboardFirst,
  copyTextToClipboard,
  isShareAbortError,
  pickNativeShareableFiles,
  prefersNativeWebShare,
  type ShareChannel,
} from "../lib/shareActions";

const UNMASKED_BPKB_WORDS = new Set(["ada", "tidak", "belum", "iya", "ya"]);

function maskBpkbName(value: string) {
  if (!value || /^(tidak|belum)\b/i.test(value.trim())) return value;
  const lower = value.toLowerCase();
  if (/\b(pt|cv|coop|koperasi|persero|perseroan|limited|ltd|gmo|group|badan hukum|pt\.)\b/.test(lower) || /\bunlimited\b/.test(lower)) {
    return "BPKB Perusahaan";
  }
  if (/\b(perorangan|pribadi|individu|nama pemilik|atas nama)\b/.test(lower)) {
    return "BPKB Perorangan";
  }
  return value.trim().split(/\s+/).map((word) => {
    const match = word.match(/^([^A-Za-zÀ-ÖØ-öø-ÿ']*)([A-Za-zÀ-ÖØ-öø-ÿ']+)([^A-Za-zÀ-ÖØ-öø-ÿ']*)$/u);
    if (!match) return word;
    const [, prefix, core, suffix] = match;
    if (UNMASKED_BPKB_WORDS.has(core.toLowerCase()) || core.length <= 2) return word;
    return `${prefix}${core[0]}${"*".repeat(core.length - 2)}${core[core.length - 1]}${suffix}`;
  }).join(" ");
}

/* ---- business logic ---- */

type ShareMedia =
  | { kind: "image"; id: string; url: string; item: GalleryItem }
  | { kind: "video"; id: string; url: string; item: VideoItem };

type PendingShareStep = {
  files: File[];
  label: string;
  includeCaption?: boolean;
};

type AiBackgroundStatus = "idle" | "generating" | "done" | "failed";

export type ShareSheetHandle = {
  share: () => void;
};

type ShareSheetProps = {
  embedded?: boolean;
  controllerOnly?: boolean;
  unitData?: ProductDetail;
  unitSlug?: string;
  params?: string;
  onClose?: () => void;
};

/* ---- canvas overlay composition ---- */

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function composeBlobToFile(
  blob: Blob,
  fallbackName = "unit.jpg",
): File {
  return new File([blob], fallbackName, { type: "image/jpeg" });
}

function positiveParamNumber(params: URLSearchParams, key: string): number | null {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function stripPriceFromCaption(caption: string) {
  return caption
    .replace(/\b(?:dengan[ \t]+)?harga(?:[ \t]+kredit)?[ \t]+(?:Rp[ \t]*)?[\d.,]+(?:[ \t]*(?:jt|juta|miliar))?[,.]?[ \t]*/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+,/g, ",")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function usefulVehicleText(value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text || /^(?:-|n\/?a|null|tidak ada(?: data)?|belum ada(?: data)?)$/i.test(text)) {
    return "";
  }
  return text;
}

function formatShareDate(value: string) {
  const isoDate = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!isoDate) return value;
  const [, year, month, day] = isoDate;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function taxValidityCaption(value: string | null | undefined) {
  const raw = usefulVehicleText(value);
  if (!raw) return "";

  const isoDate = raw.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  const formatted = formatShareDate(raw);
  if (!isoDate) return `Pajak/STNK s.d. ${formatted}`;

  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return isoDate < todayKey
    ? `Pajak/STNK jatuh tempo ${formatted}`
    : `Pajak/STNK berlaku s.d. ${formatted}`;
}

function detailSpec(unit: ProductDetail, label: string) {
  return usefulVehicleText(
    unit.spesifikasi.find((item) => item.label.toLowerCase() === label.toLowerCase())?.value,
  );
}

function sellingPointCaption(description: string) {
  const points = usefulVehicleText(description)
    .split(/[.!?]+/)
    .map((point) => point.trim())
    .filter(Boolean)
    .filter((point) => !/^harga\b/i.test(point))
    .slice(0, 2);
  if (points.length === 0) return "";
  if (points.length === 1) return points[0];
  return `${points[0]} dan ${points[1].charAt(0).toLowerCase()}${points[1].slice(1)}`;
}

function shareVehicleFacts(unit: ProductDetail) {
  const facts = [
    unit.odometer > 0 ? `KM ${formatOdometer(unit.odometer)}` : "",
    taxValidityCaption(unit.stnk_expiry),
    usefulVehicleText(unit.transmisi)
      ? `transmisi ${prettyTransmisi(unit.transmisi)}`
      : "",
  ];
  const ownership = detailSpec(unit, "Status Kepemilikan");
  if (ownership) {
    facts.push(`kepemilikan ${ownership}`);
  } else if (usefulVehicleText(unit.bpkb_name)) {
    facts.push("BPKB tersedia");
  }

  const sellingPoints = sellingPointCaption(unit.deskripsi);
  const note = usefulVehicleText(unit.notes_unit);
  const factItems = facts.filter(Boolean);
  return {
    summary: factItems.join(", "),
    lines: factItems.map((fact) => `• ${fact}`).join("\n"),
    condition: [
      sellingPoints ? `Keunggulan: ${sellingPoints}` : "",
      note && !/^[\d\s.,%]+$/.test(note) ? `Catatan unit: ${note}` : "",
    ].filter(Boolean).join(". "),
  };
}

function shortAmountMatches(value: number) {
  const short = formatJt(value);
  return [short, short.replace(/jt$/i, " juta")];
}

async function fetchRawBlob(pathOrUrl: string, cache: Map<string, Blob>) {
  if (cache.has(pathOrUrl)) return cache.get(pathOrUrl)!;
  const src = mobixImageFetchableWithWidth(pathOrUrl, 2560);
  if (!src) return null;
  try {
    const r = await fetch(src);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob) cache.set(pathOrUrl, blob);
    return blob;
  } catch {
    return null;
  }
}

async function fetchRawMediaBlob(pathOrUrl: string, cache: Map<string, Blob>) {
  if (cache.has(pathOrUrl)) return cache.get(pathOrUrl)!;
  const src = mobixMediaFetchable(pathOrUrl);
  if (!src) return null;
  try {
    const r = await fetch(src);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob) cache.set(pathOrUrl, blob);
    return blob;
  } catch {
    return null;
  }
}

function videoBlobToFile(blob: Blob, index: number) {
  const type = blob.type || "video/mp4";
  const ext = type.includes("quicktime")
    ? "mov"
    : type.includes("webm")
      ? "webm"
      : "mp4";
  return new File([blob], `unit-video-${index + 1}.${ext}`, { type });
}

async function buildShareImagesViaBackend(
  selectedGallery: ProductDetail["galeri"],
  dealHarga: number,
  tdp: number,
  includeOverlay: boolean,
): Promise<File[]> {
  const sources = selectedGallery
    .map((g) => g?.url)
    .filter((value): value is string => Boolean(value));
  const entries = await Promise.all(
    sources.map(async (source, index) => {
      const blob = await composeShareImageViaBackend({
        source,
        price: dealHarga,
        tdp,
        includeOverlay,
        width: 1280,
        height: 720,
        crop: "cover",
      });
      if (!blob) return null;
      return composeBlobToFile(blob, `unit-photo-${index + 1}.jpg`);
    }),
  );

  return entries.filter(Boolean) as File[];
}

async function buildShareImagesLocally(
  selectedGallery: ProductDetail["galeri"],
  dealHarga: number,
  tdp: number,
  includeOverlay: boolean,
  cache: Map<string, Blob>,
): Promise<File[]> {
  const sources = selectedGallery
    .map((g) => g?.url)
    .filter((value): value is string => Boolean(value));
  const blobs = await Promise.all(
    sources.map((url) => fetchRawBlob(url, cache)),
  );
  const valid = blobs.filter(Boolean) as Blob[];
  return Promise.all(
    valid.map((blob, index) =>
      composeOverlay(blob, dealHarga, tdp, includeOverlay, "cover", `unit-photo-${index + 1}.jpg`),
    ),
  );
}

async function buildShareImages(
  selectedGallery: ProductDetail["galeri"],
  dealHarga: number,
  tdp: number,
  includeOverlay: boolean,
  cache: Map<string, Blob>,
) {
  const backendFiles = await buildShareImagesViaBackend(
    selectedGallery,
    dealHarga,
    tdp,
    includeOverlay,
  );

  return backendFiles.length > 0
    ? backendFiles
    : buildShareImagesLocally(
        selectedGallery,
        dealHarga,
        tdp,
        includeOverlay,
        cache,
      );
}

async function buildShareVideos(
  selectedVideos: VideoItem[],
  cache: Map<string, Blob>,
) {
  const blobs = await Promise.all(
    selectedVideos.map((video) => fetchRawMediaBlob(video.url, cache)),
  );

  return blobs
    .map((blob, index) => (blob ? videoBlobToFile(blob, index) : null))
    .filter(Boolean) as File[];
}

async function composeOverlay(
  rawBlob: Blob,
  dealHarga: number,
  tdp: number,
  includeOverlay = true,
  crop: "cover" | "contain" = "cover",
  fileName = "unit.jpg",
): Promise<File> {
  const bitmap = await createImageBitmap(rawBlob);
  const W = 1280,
    H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  if (crop === "cover") {
    // cover crop — fill full canvas
    const scale = Math.max(W / bitmap.width, H / bitmap.height);
    const sw = bitmap.width * scale,
      sh = bitmap.height * scale;
    ctx.drawImage(bitmap, (W - sw) / 2, (H - sh) / 2, sw, sh);
  } else {
    // contain — show full image, letterbox if needed
    const scale = Math.min(W / bitmap.width, H / bitmap.height);
    const sw = bitmap.width * scale,
      sh = bitmap.height * scale;
    ctx.drawImage(bitmap, (W - sw) / 2, (H - sh) / 2, sw, sh);
  }

  // price pill (only when includeOverlay is true)
  if (includeOverlay) {
    const text = `Rp ${formatJt(dealHarga)} · TDP ${formatJt(tdp)}`;
    const fs = 44;
    ctx.font = `bold ${fs}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    const tw = ctx.measureText(text).width;
    const px = 28,
      py = 16;
    const bx = 28,
      bh = fs + py * 2,
      by = H - 28 - bh;
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    roundRectPath(ctx, bx, by, tw + px * 2, bh, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + px, by + bh / 2);
  }

  // mobix logo – white tint (top-right)
  try {
    const logoBlob = await fetch("/mobix-logo.png").then((r) => r.blob());
    const logoBitmap = await createImageBitmap(logoBlob);
    const lw = Math.round(W * 0.1);
    const lh = Math.round((lw * logoBitmap.height) / logoBitmap.width);
    const tmp = document.createElement("canvas");
    tmp.width = lw;
    tmp.height = lh;
    const tc = tmp.getContext("2d")!;
    tc.drawImage(logoBitmap, 0, 0, lw, lh);
    tc.globalCompositeOperation = "source-in";
    tc.fillStyle = "white";
    tc.fillRect(0, 0, lw, lh);
    ctx.drawImage(tmp, W - lw - 24, 24);
  } catch {
    /* logo fetch failed – skip */
  }

  return new Promise<File>((resolve) =>
    canvas.toBlob(
      (blob) =>
        resolve(new File([blob!], fileName, { type: "image/jpeg" })),
      "image/jpeg",
      0.92,
    ),
  );
}

/* ---- component ---- */

const CAPTION_STYLE_HINTS = [
  "Straight to the point: unit, strongest buyer reason, credit package, CTA.",
  "Short WhatsApp sales copy, max two sentences, no long description.",
  "Make the car feel like a smart buy without listing too many specs.",
  "Punchy and persuasive, sparks curiosity, easy to reply to.",
  "Make TDP and installment feel attractive, but keep every number factual.",
  "Energetic social caption, concise, persuasive, and not exaggerated.",
];

export const ShareSheet = forwardRef<ShareSheetHandle, ShareSheetProps>(function ShareSheet(
  { embedded = false, controllerOnly = false, unitData, unitSlug, params, onClose },
  ref,
) {
  const search = useSearch();
  const searchParams = new URLSearchParams(params ?? search);
  const slug = unitSlug ?? searchParams.get("u") ?? "";
  const { data: fetchedUnit, loading: unitLoading } = useAsync(
    () => unitData ? Promise.resolve(unitData) : fetchUnitDetail(slug),
    [slug, unitData?.id],
  );
  const unit = unitData ?? fetchedUnit;
  const loading = !unitData && unitLoading;

  const [captionText, setCaptionText] = useState("");
  const [captionSuggesting, setCaptionSuggesting] = useState(false);
  const [pendingShareStep, setPendingShareStep] = useState<PendingShareStep | null>(null);
  const [showChannels, setShowChannels] = useState(false);
  const [shareCaptionCopied, setShareCaptionCopied] = useState(false);

  // multi-select share media
  const [selectedIdxes, setSelectedIdxes] = useState<number[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // canvas-composed files without price/TDP overlay — for download
  const [composedFiles, setComposedFiles] = useState<File[]>([]);
  const [composing, setComposing] = useState(false);

  const [aiBackgroundStatus, setAiBackgroundStatus] = useState<AiBackgroundStatus>("idle");
  const [, setAiBackgroundProgress] = useState(0);
  const [aiBackgroundFiles, setAiBackgroundFiles] = useState<Record<string, File>>({});
  const [aiBackgroundUrls, setAiBackgroundUrls] = useState<Record<string, string>>({});
  const [aiPreviewMode, setAiPreviewMode] = useState<"ai" | "original">("ai");
  const [, setAiBackgroundError] = useState("");
  const [liveSimulation, setLiveSimulation] = useState<CreditSimulationResult | null>(null);
  const [appliedSimulation, setAppliedSimulation] = useState<CreditSimulationResult | null>(null);
  const [appliedPrice, setAppliedPrice] = useState(0);
  const [priceInput, setPriceInput] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const blobCache = useRef<Map<string, Blob>>(new Map());
  const captionSuggestionIndex = useRef(0);
  const forceCaptionUpdateRef = useRef(false);
  const handleSimulationChange = useCallback((result: CreditSimulationResult) => {
    setLiveSimulation(result);
  }, []);

  const gallery = unit?.galeri ?? [];
  const videos = unit?.video ?? [];
  const mediaItems: ShareMedia[] = [
    ...gallery.map((item) => ({
      kind: "image" as const,
      id: `image-${item.id}`,
      url: item.url,
      item,
    })),
    ...videos.map((item) => ({
      kind: "video" as const,
      id: `video-${item.id}`,
      url: item.url,
      item,
    })),
  ];
  const activeMedia = mediaItems[previewIdx] ?? mediaItems[0];
  const selectedMediaItems = selectedIdxes
    .map((i) => mediaItems[i])
    .filter((media): media is ShareMedia => Boolean(media));
  const selectedImageMedia = selectedMediaItems.filter(
    (media): media is Extract<ShareMedia, { kind: "image" }> => media.kind === "image",
  );
  const selectedImageCount = selectedMediaItems.filter((media) => media.kind === "image").length;
  const selectedVideoCount = selectedMediaItems.filter((media) => media.kind === "video").length;
  const selectedMediaLabel =
    selectedImageCount > 0 && selectedVideoCount > 0
      ? `${selectedImageCount} foto + ${selectedVideoCount} video dipilih`
      : selectedVideoCount > 0
        ? `${selectedVideoCount} video dipilih`
        : `${selectedImageCount || selectedIdxes.length} foto dipilih`;
  const selectedMediaButtonLabel =
    selectedImageCount > 0 && selectedVideoCount > 0
      ? `${selectedImageCount} foto + ${selectedVideoCount} video`
      : selectedVideoCount > 0
        ? `${selectedVideoCount} video`
        : `${selectedImageCount || selectedIdxes.length} foto`;
  const isMixedMediaSelected = selectedImageCount > 0 && selectedVideoCount > 0;
  const shareButtonLabel = pendingShareStep
    ? pendingShareStep.label
    : isMixedMediaSelected
      ? "Share bertahap: video dulu"
      : "Share ke social media";
  const financingEligible = unit?.pembiayaan.eligible === true;
  const salesContactRequired = requiresSalesContact(unit?.pembiayaan);
  const requestedDpMinimShare =
    appliedSimulation?.simTab === "dpminim" ||
    (!appliedSimulation && searchParams.get("sim") === "dpminim");
  const shareTenor =
    appliedSimulation?.tenor ??
    positiveParamNumber(searchParams, "tenor") ??
    60;
  const shareTdp =
    appliedSimulation?.tdp ??
    positiveParamNumber(searchParams, "tdp") ??
    unit?.tdp ??
    0;
  const shareCicilan =
    appliedSimulation?.cicilan ??
    positiveParamNumber(searchParams, "cicilan") ??
    unit?.cicilan ??
    0;
  const shareDp =
    appliedSimulation?.dp ??
    positiveParamNumber(searchParams, "dp") ??
    null;
  const shareDpPercent =
    appliedSimulation?.dpPercent ??
    positiveParamNumber(searchParams, "dp_pct") ??
    null;
  const shareHasFinancing = financingEligible && shareTdp > 0 && shareCicilan > 0;
  const isDpMinimShare = requestedDpMinimShare && shareHasFinancing;
  const initialSharePrice = positiveParamNumber(searchParams, "harga") ?? unit?.harga ?? 0;
  const sharePrice = appliedPrice || initialSharePrice;
  const unitAdminMessage = unit
    ? `Halo AI Mobix Assistant! Mau tanya soal unit *${unit.nama}* (plat ${unit.plate_no}) di cabang ${titleCase(unit.lokasi || "Mobix")}, harga ${formatRupiah(sharePrice || unit.harga)}. Bisa bantu info lebih lanjut? 🙏`
    : "";
  const unitCalculationMessage = unit
    ? salesContactRequired
      ? `Halo Jasmine, saya mau menanyakan opsi pembiayaan lain untuk unit *${unit.nama}* (plat ${unit.plate_no}) di cabang ${titleCase(unit.lokasi || "Mobix")}, harga ${formatRupiah(sharePrice || unit.harga)}. Pembiayaan DSF tidak tersedia untuk unit ini.`
      : `Halo Admin, saya mau minta hitungan leasing untuk unit *${unit.nama}* (plat ${unit.plate_no}) di cabang ${titleCase(unit.lokasi || "Mobix")}, harga ${formatRupiah(sharePrice || unit.harga)}.\n1. DP minim\n2. Cicilan ringan\n3. Cair All in`
    : "";
  const jasmineCalculationHref = buildJasmineWhatsAppHref(unitCalculationMessage);
  const captionPrice = appliedSimulation?.hargaKredit ?? sharePrice ?? unit?.harga ?? 0;
  const shouldHidePriceInCaption = isDpMinimShare;
  const packageTitle = shareHasFinancing ? (isDpMinimShare ? "DP Minim" : "Kredit") : "Unit";
  const paymentLabel = "TDP";
  const paymentValue = isDpMinimShare && shareDp ? shareDp : shareTdp;
  const shareCommission =
    positiveParamNumber(searchParams, "komisi") ??
    (unit && sharePrice ? estimateBuilderCommission(unit.harga, sharePrice) : 0);
  const vehicleFacts = unit ? shareVehicleFacts(unit) : null;
  const autoCaption = unit
    ? !shareHasFinancing
      ? [
          unit.nama,
          vehicleFacts?.lines,
          vehicleFacts?.condition,
          `Harga ${formatRupiah(captionPrice)}`,
          `Unit tercatat di cabang ${titleCase(unit.lokasi || "Mobix")}, cek ketersediaannya terlebih dahulu.`,
          "Chat saya ya",
        ].filter(Boolean).join("\n\n")
      : isDpMinimShare
      ? [
          unit.nama,
          vehicleFacts?.lines,
          vehicleFacts?.condition,
          `Paket DP Minim ${formatJt(paymentValue)}\nCicilan ${formatJt(shareCicilan)}/bln • Tenor ${shareTenor} bulan`,
          `Unit tercatat di cabang ${titleCase(unit.lokasi || "Mobix")}, cek ketersediaannya terlebih dahulu.`,
          "Chat saya ya",
        ].filter(Boolean).join("\n\n")
      : [
          unit.nama,
          vehicleFacts?.lines,
          vehicleFacts?.condition,
          `Harga ${formatRupiah(captionPrice)}\nTDP ${formatJt(shareTdp)} • Cicilan ${formatJt(shareCicilan)}/bln • Tenor ${shareTenor} bulan`,
          `Unit tercatat di cabang ${titleCase(unit.lokasi || "Mobix")}, cek ketersediaannya terlebih dahulu.`,
          "Chat saya ya",
        ].filter(Boolean).join("\n\n")
    : "";

  function replaceAiBackgroundFiles(entries: Array<[string, File, string]>) {
    const files: Record<string, File> = {};
    const urls: Record<string, string> = {};
    entries.forEach(([id, file, url]) => {
      files[id] = file;
      urls[id] = url;
    });
    setAiBackgroundFiles(files);
    setAiBackgroundUrls(urls);
  }

  function mergeAiBackgroundFiles(entries: Array<[string, File, string]>) {
    setAiBackgroundFiles((prev) => {
      const next = { ...prev };
      entries.forEach(([id, file]) => {
        next[id] = file;
      });
      return next;
    });
    setAiBackgroundUrls((prev) => {
      const next = { ...prev };
      entries.forEach(([id, , url]) => {
        next[id] = url;
      });
      return next;
    });
  }

  async function buildImageFilesForShare(
    imageMedia: Array<Extract<ShareMedia, { kind: "image" }>>,
  ) {
    if (
      aiBackgroundStatus === "done" &&
      aiPreviewMode === "ai" &&
      imageMedia.some((media) => aiBackgroundFiles[media.id])
    ) {
      const files = await Promise.all(
        imageMedia.map(async (media) => {
          const aiFile = aiBackgroundFiles[media.id];
          if (aiFile) return aiFile;
          const fallback = await buildShareImages(
            [media.item],
            sharePrice,
            shareTdp,
            false,
            blobCache.current,
          );
          return fallback[0] ?? null;
        }),
      );
      return files.filter(Boolean) as File[];
    }

    return buildShareImages(
      imageMedia.map((media) => media.item),
      sharePrice,
      shareTdp,
      false,
      blobCache.current,
    );
  }

  const lastAutoCaptionRef = useRef("");

  // init when unit loads (jangan reset caption tiap simulasi berubah)
  useEffect(() => {
    if (!unit) return;
    // Default 1 foto dulu — share multi-file di Android sering ditolak (canShare/share gagal → popup).
    // User bisa multi-select manual kalau mau.
    setSelectedIdxes(
      unit.galeri.length > 0 ? [0] : unit.video?.length ? [0] : [],
    );
    setPreviewIdx(0);
    setCaptionText(autoCaption);
    lastAutoCaptionRef.current = autoCaption;
    setPendingShareStep(null);
    setLiveSimulation(null);
    setAppliedSimulation(null);
    setAppliedPrice(initialSharePrice);
    setPriceInput(new Intl.NumberFormat("id-ID").format(initialSharePrice));
    setAiBackgroundStatus("idle");
    setAiBackgroundProgress(0);
    setAiPreviewMode("ai");
    setAiBackgroundError("");
    replaceAiBackgroundFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya re-init saat unit berganti
  }, [unit?.id]);

  // sinkronkan caption otomatis saat hasil simulasi live siap (jika user belum edit)
  useEffect(() => {
    if (!unit || !autoCaption) return;
    setCaptionText((current) => {
      if (forceCaptionUpdateRef.current) {
        forceCaptionUpdateRef.current = false;
        lastAutoCaptionRef.current = autoCaption;
        return autoCaption;
      }
      if (!current || current === lastAutoCaptionRef.current) {
        lastAutoCaptionRef.current = autoCaption;
        return autoCaption;
      }
      return current;
    });
  }, [unit?.id, autoCaption]);

  function applyBuilderPrice() {
    if (!unit) return;
    const rawPrice = Number(priceInput.replace(/\D/g, ""));
    const nextPrice = clampBuilderPrice(rawPrice || unit.harga, unit.harga);
    forceCaptionUpdateRef.current = nextPrice !== sharePrice;
    setAppliedPrice(nextPrice);
    setAppliedSimulation(null);
    setPriceInput(new Intl.NumberFormat("id-ID").format(nextPrice));
  }

  function applyCreditSimulation() {
    if (!liveSimulation?.canShare) return;
    forceCaptionUpdateRef.current = JSON.stringify(liveSimulation) !== JSON.stringify(appliedSimulation);
    setAppliedSimulation(liveSimulation);
  }

  // fetch raw blobs (cached) + compose download files whenever selection changes
  useEffect(() => {
    if (!unit || !mediaItems.length) return;
    let alive = true;
    setComposing(true);
    // Jangan share file lama saat seleksi baru masih disusun (stale multi-file → gagal native).
    setComposedFiles([]);
    setPendingShareStep(null);

    const selectedMedia = selectedIdxes
      .map((i) => mediaItems[i])
      .filter(Boolean);
    const selectedImages = selectedMedia
      .filter((media): media is Extract<ShareMedia, { kind: "image" }> => media.kind === "image");
    const selectedVideos = selectedMedia
      .filter((media): media is Extract<ShareMedia, { kind: "video" }> => media.kind === "video")
      .map((media) => media.item);

    async function run() {
      const imageFiles = selectedImages.length
        ? await buildImageFilesForShare(selectedImages)
        : [];
      const videoFiles = selectedVideos.length
        ? await buildShareVideos(selectedVideos, blobCache.current)
        : [];
      if (!alive) return;

      setComposedFiles([...imageFiles, ...videoFiles]);
      setComposing(false);
    }

    run().catch(() => {
      if (alive) {
        setComposedFiles([]);
        setComposing(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [
    unit,
    selectedIdxes.join(","),
    sharePrice,
    shareTdp,
    aiBackgroundStatus,
    aiPreviewMode,
    Object.keys(aiBackgroundFiles).join(","),
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGalleryTap(i: number) {
    setPendingShareStep(null);
    setPreviewIdx(i);
    setSelectedIdxes((prev) => {
      if (prev.includes(i)) {
        if (prev.length === 1) return prev; // keep at least one selected
        return prev.filter((x) => x !== i);
      }
      return [...prev, i].sort((a, b) => a - b);
    });
  }

  const link = buildAgenMobixUnitLink(unit?.slug);

  async function waitForAIBackgroundJob(
    initial: AIBackgroundResponse,
    onProgress: (progress: number) => void,
  ) {
    let current = initial;
    onProgress(current.progress || (current.status === "done" ? 100 : 10));

    for (let attempt = 0; attempt < 180; attempt += 1) {
      if (current.status === "done" || current.status === "failed") {
        return current;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      current = await fetchAIBackgroundStatus(current.job_id);
      onProgress(current.progress || 20);
    }

    throw new Error("Generate background terlalu lama. Coba lagi sebentar.");
  }

  async function handleGenerateAiBackground(force = false) {
    if (!unit || aiBackgroundStatus === "generating" || selectedImageMedia.length === 0) return;

    const activeIsSelectedImage = activeMedia?.kind === "image" && selectedImageMedia.some((media) => media.id === activeMedia.id);
    if (!activeIsSelectedImage) {
      const firstSelectedImageIdx = mediaItems.findIndex((media) => media.id === selectedImageMedia[0].id);
      if (firstSelectedImageIdx >= 0) {
        setPreviewIdx(firstSelectedImageIdx);
      }
    }

    setAiBackgroundStatus("generating");
    setAiBackgroundError("");
    setAiBackgroundProgress(6);
    setAiPreviewMode("ai");

    try {
      const progressByMedia: Record<string, number> = {};
      const updateAggregateProgress = (id: string, progress: number) => {
        progressByMedia[id] = progress;
        const values = selectedImageMedia.map((media) => progressByMedia[media.id] ?? 6);
        const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
        setAiBackgroundProgress(Math.min(99, avg));
      };

      const entries = await Promise.all(
        selectedImageMedia.map(async (media, index) => {
          const started = await generateAIBackground({
            source: media.item.url,
            slug: unit.slug,
            nama: unit.nama,
            merek: unit.brand,
            warna: unit.color,
            tahun: unit.year,
            plate_no: unit.plate_no,
            force,
          });
          const result = await waitForAIBackgroundJob(started, (progress) =>
            updateAggregateProgress(media.id, progress),
          );
          if (result.status !== "done" || !result.image_url) {
            throw new Error(result.message || "AI background gagal dibuat");
          }

          const blob = await fetchRawMediaBlob(result.image_url, blobCache.current);
          if (!blob) return null;
          const file = new File([blob], `unit-ai-background-${index + 1}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          return [media.id, file, mobixMedia(result.image_url) ?? result.image_url] as [string, File, string];
        }),
      );
      const validEntries = entries.filter(Boolean) as Array<[string, File, string]>;

      mergeAiBackgroundFiles(validEntries);
      setAiBackgroundProgress(100);
      setAiBackgroundStatus(validEntries.length > 0 ? "done" : "failed");
      if (validEntries.length === 0) {
        setAiBackgroundError("Tidak ada foto AI yang berhasil dibuat.");
      }
    } catch (error) {
      setAiBackgroundProgress(0);
      setAiBackgroundStatus("failed");
      setAiBackgroundError(
        error instanceof Error ? error.message : "Gagal membuat AI background.",
      );
    }
  }

  function showShareCaptionCopied() {
    setShareCaptionCopied(true);
    window.setTimeout(() => setShareCaptionCopied(false), 2500);
  }

  async function copyShareCaption(caption: string) {
    const text = buildShareText(caption, link);
    if (await copyTextToClipboard(text)) {
      showShareCaptionCopied();
      return true;
    }
    return false;
  }

  function openShareChannels() {
    setShowChannels(true);
  }

  /** Desktop / unsupported browser: channel picker (not used when user cancels native sheet). */
  function fallbackChannelShare(caption: string) {
    void copyShareCaption(caption);
    openShareChannels();
  }

  /**
   * Start native file share from the click handler (no prior await) so user
   * activation stays valid. Returns null when native share is unavailable.
   * Smartphones: system share sheet (installed apps). Desktop: skipped.
   * Auto-reduce file count when canShare rejects large multi-file batches.
   */
  function sharePreparedFiles(
    files: File[],
    title: string,
    caption: string,
  ): Promise<void> | null {
    if (!prefersNativeWebShare() || files.length === 0) return null;

    const shareText = buildShareText(caption, link);
    const shareable = pickNativeShareableFiles(files, title, shareText);
    const payload = buildNativeSharePayload(shareable, title, shareText);
    if (!payload) return null;

    // Backup: many apps drop caption when receiving files.
    if (shareText) {
      void copyShareCaption(caption);
    }

    return navigator.share(payload);
  }

  /** Native text share (mobile) — caption + link in `text`, no separate `url`. */
  function shareWithoutFiles(title: string, caption: string): Promise<void> | null {
    if (!prefersNativeWebShare()) return null;
    const shareText = buildShareText(caption, link);
    const payload = buildNativeSharePayload([], title, shareText);
    if (!payload) return null;

    if (shareText) {
      void copyShareCaption(caption);
    }

    return navigator.share(payload);
  }

  async function handleCaptionAiHelp() {
    if (!unit || captionSuggesting) return;
    setCaptionSuggesting(true);

    const styleHint = shareHasFinancing
      ? CAPTION_STYLE_HINTS[captionSuggestionIndex.current % CAPTION_STYLE_HINTS.length]
      : "Lead with the unit's strongest verified selling point and cash price.";
    const color = titleCase(unit.color || "");
    const branch = titleCase(unit.lokasi || "Mobix");
    const km = formatOdometer(unit.odometer);
    const taxInfo = taxValidityCaption(unit.stnk_expiry);
    const facts = shareVehicleFacts(unit);
    const tdp = formatJt(shareTdp);
    const installment = formatJt(shareCicilan);
    const creditPackage = !shareHasFinancing
      ? `harga ${formatRupiah(captionPrice)}`
      : isDpMinimShare
        ? `paket DP Minim ${formatJt(paymentValue)}, cicilan ${installment}/bln tenor ${shareTenor} bulan`
        : `TDP ${tdp}, cicilan ${installment}/bln tenor ${shareTenor} bulan`;
    const packageWithPrice = !shareHasFinancing
      ? creditPackage
      : shouldHidePriceInCaption
        ? creditPackage
        : `harga kredit ${formatRupiah(captionPrice)}, ${creditPackage}`;
    const category =
      unit.category && unit.category.length <= 4
        ? unit.category.toUpperCase()
        : unit.category
          ? titleCase(unit.category)
          : "mobil";
    const dpInfo =
      shareHasFinancing && shareDp && shareDpPercent && !shouldHidePriceInCaption
        ? ` DP ${formatRupiah(shareDp)} (${Math.round(shareDpPercent * 10) / 10}%).`
        : "";
    const colorInfo = color ? ` warna ${color}` : "";
    const specs = [
      unit.year ? `tahun ${unit.year}` : "",
      unit.transmisi ? `transmisi ${titleCase(unit.transmisi)}` : "",
      color ? `warna ${color}` : "",
      `KM ${km}`,
      taxInfo,
    ].filter(Boolean).join(", ");
    const factBlock = facts.lines || `• KM ${km}`;
    const conditionInfo = facts.condition ? ` ${facts.condition}.` : "";
    const readablePackage = `${packageWithPrice.charAt(0).toUpperCase()}${packageWithPrice.slice(1)}`;
    const ownership = detailSpec(unit, "Status Kepemilikan");
    const requiredDetailFacts = [
      { line: `Unit: ${unit.nama}`, matches: [unit.nama] },
      { line: `KM ${km}`, matches: [`KM ${km}`, `${km} KM`] },
      ...(taxInfo ? [{ line: taxInfo }] : []),
      ...(usefulVehicleText(unit.transmisi)
        ? [{
            line: `Transmisi ${prettyTransmisi(unit.transmisi)}`,
            matches: [
              `Transmisi ${prettyTransmisi(unit.transmisi)}`,
              prettyTransmisi(unit.transmisi),
            ],
          }]
        : []),
      ...(ownership
        ? [{
            line: `Kepemilikan ${ownership}`,
            matches: [`Kepemilikan ${ownership}`, ownership],
          }]
        : usefulVehicleText(unit.bpkb_name)
          ? [{ line: "BPKB tersedia" }]
          : []),
    ];
    const requiredPackageFacts = !shareHasFinancing
      ? [
          {
            line: `Harga ${formatRupiah(captionPrice)}`,
            matches: [
              formatRupiah(captionPrice),
              formatRupiah(captionPrice).replace(/^Rp\s*/i, ""),
            ],
          },
        ]
      : isDpMinimShare
        ? [
          {
            line: `Paket DP Minim ${formatJt(paymentValue)}`,
            matches: [
              `DP Minim ${formatJt(paymentValue)}`,
              ...shortAmountMatches(paymentValue),
            ],
          },
          {
            line: `Cicilan ${installment}/bln`,
            matches: shortAmountMatches(shareCicilan),
          },
          { line: `Tenor ${shareTenor} bulan`, matches: [`${shareTenor} bulan`] },
        ]
        : [
          {
            line: `Harga ${formatRupiah(captionPrice)}`,
            matches: [
              formatRupiah(captionPrice),
              formatRupiah(captionPrice).replace(/^Rp\s*/i, ""),
            ],
          },
          { line: `TDP ${tdp}`, matches: shortAmountMatches(shareTdp) },
          {
            line: `Cicilan ${installment}/bln`,
            matches: shortAmountMatches(shareCicilan),
          },
          { line: `Tenor ${shareTenor} bulan`, matches: [`${shareTenor} bulan`] },
        ];
    const requiredCaptionSections: RequiredCaptionSection[] = [
      { heading: "Detail unit", facts: requiredDetailFacts },
      {
        heading: shareHasFinancing ? "Paket pembiayaan" : "Harga",
        facts: requiredPackageFacts,
      },
      {
        heading: "Lokasi",
        facts: [
          {
            line: `Unit tercatat di cabang ${branch}`,
            matches: [`cabang ${branch}`, branch],
          },
        ],
      },
    ];
    const protectedAiFactTerms = [
      "km",
      "kilometer",
      "pajak",
      "stnk",
      "harga",
      ...(shareHasFinancing ? ["tdp", "cicilan", "tenor"] : []),
      "transmisi",
      "matic",
      "manual",
      "kepemilikan",
      "bpkb",
      "cabang",
      branch,
      taxInfo,
      formatRupiah(captionPrice),
      ...(shareHasFinancing
        ? [formatJt(shareTdp), formatJt(shareCicilan), `${shareTenor} bulan`]
        : []),
    ].filter(Boolean);

    const variants = [
      `${unit.nama}${colorInfo}\n\n${factBlock}${conditionInfo ? `\n\n${conditionInfo.trim()}` : ""}\n\n${readablePackage}\n\nUnit tercatat di ${branch}. Chat saya untuk cek ketersediaannya.`,
      `Mau ${category} yang paketnya jelas?\n\n${unit.nama}\n\n${factBlock}${conditionInfo ? `\n\n${conditionInfo.trim()}` : ""}\n\n${readablePackage}\n\nMinat? Langsung chat saya.`,
      `${unit.nama}\n\n${specs}${conditionInfo ? `\n${conditionInfo.trim()}` : ""}\n\n${readablePackage}\n\nCek unitnya di ${branch}.`,
      `${unit.nama}${colorInfo}\n\n${factBlock}${conditionInfo ? `\n\n${conditionInfo.trim()}` : ""}\n\nPaketnya sudah jelas: ${packageWithPrice}.\n\nChat saya kalau mau cek.`,
      `${unit.nama}\n\n${factBlock}${conditionInfo ? `\n\n${conditionInfo.trim()}` : ""}\n\nUnit tercatat di ${branch}.\n${readablePackage}.${dpInfo}\n\nMau saya bantu cek ketersediaannya?`,
      `Cari ${category} praktis dan menarik?\n\n${unit.nama}${colorInfo}\n\n${factBlock}${conditionInfo ? `\n\n${conditionInfo.trim()}` : ""}\n\n${readablePackage}.`,
    ];

    try {
      const aiCaption = await suggestShareCaption({
        slug: unit.slug,
        nama: unit.nama,
        warna: unit.color,
        tahun: unit.year,
        kilometer: unit.odometer,
        kategori: unit.category,
        transmisi: unit.transmisi,
        cabang: branch,
        harga_builder: sharePrice,
        harga_kredit: shareHasFinancing && !isDpMinimShare ? captionPrice : undefined,
        tdp: shareHasFinancing ? shareTdp : undefined,
        cicilan: shareHasFinancing ? shareCicilan : undefined,
        tenor: shareHasFinancing ? shareTenor : undefined,
        dp: shareHasFinancing ? shareDp ?? undefined : undefined,
        dp_pct: shareHasFinancing ? shareDpPercent ?? undefined : undefined,
        caption_saat_ini: captionText || autoCaption,
        style_hint: !shareHasFinancing
          ? `${styleHint} Write only a short selling hook and CTA using verified non-numeric selling points. Do not invent financing, TDP, installment, tenor, or credit eligibility. The application will add the verified cash price and unit facts separately.`
          : shouldHidePriceInCaption
          ? `${styleHint} Write only a short selling hook and CTA using verified non-numeric selling points. Do not repeat specifications, odometer, tax/STNK, transmission, ownership, pricing, financing, tenor, or branch; the application will add those facts separately. Do not claim accident-free, flood-free, or complete service history.`
          : `${styleHint} Write only a short selling hook and CTA using verified non-numeric selling points. Do not repeat specifications, odometer, tax/STNK, transmission, ownership, price, TDP, installment, tenor, or branch; the application will add those facts separately. Do not claim accident-free, flood-free, or complete service history.`,
      });
      const safeCaption = shouldHidePriceInCaption ? stripPriceFromCaption(aiCaption) : aiCaption;
      const aiSellingCopy = removeCaptionParagraphsContaining(
        formatCaptionReadability(safeCaption),
        protectedAiFactTerms,
      );
      setCaptionText(
        ensureRequiredCaptionFacts(
          aiSellingCopy,
          requiredCaptionSections,
        ),
      );
      captionSuggestionIndex.current += 1;
    } catch {
      const nextCaption = variants[captionSuggestionIndex.current % variants.length];
      captionSuggestionIndex.current += 1;
      setCaptionText(nextCaption);
    } finally {
      setCaptionSuggesting(false);
    }
  }

  function handleShare() {
    const caption = captionText.trim();
    const title = unit ? `${packageTitle} ${unit.nama}` : "Mobix";

    // Media masih disusun — jangan fallback popup (sering terasa "kadang popup").
    if (composing) return;

    const filesToShare = pendingShareStep?.files ?? composedFiles;
    const imageFiles = filesToShare.filter((file) => file.type.startsWith("image/"));
    const videoFiles = filesToShare.filter((file) => file.type.startsWith("video/"));
    const hasMixedMediaFiles = imageFiles.length > 0 && videoFiles.length > 0;
    const filesForCurrentStep = hasMixedMediaFiles ? videoFiles : filesToShare;
    const captionForCurrentStep = pendingShareStep?.includeCaption === false ? "" : caption;

    const markShareStepDone = () => {
      if (pendingShareStep) {
        setPendingShareStep(null);
      } else if (hasMixedMediaFiles) {
        setPendingShareStep({
          files: imageFiles,
          label: imageFiles.length > 1
            ? `Lanjut bagikan ${imageFiles.length} foto`
            : "Lanjut bagikan foto",
          includeCaption: false,
        });
      }
    };

    // Smartphone: native system share sheet first (pick installed apps).
    // Desktop / unsupported / failed (not user cancel): channel picker popup.
    // Call navigator.share synchronously from the click (no prior await) so
    // transient user activation remains valid.
    const sharePromise =
      sharePreparedFiles(filesForCurrentStep, title, captionForCurrentStep)
      ?? shareWithoutFiles(title, caption);

    if (!sharePromise) {
      // HP tanpa file siap: coba text native dulu sudah di atas; desktop → popup.
      fallbackChannelShare(caption);
      return;
    }

    void sharePromise
      .then(() => {
        markShareStepDone();
      })
      .catch((error: unknown) => {
        // User dismissed the system sheet — stay silent (no channel popup).
        if (isShareAbortError(error)) return;

        // File share sering gagal di Android (terlalu banyak/besar).
        // Langsung retry text-only di rantai catch yang sama (masih sering diizinkan).
        if (filesForCurrentStep.length > 0) {
          const textOnly = shareWithoutFiles(title, caption);
          if (textOnly) {
            void textOnly
              .then(() => {
                markShareStepDone();
              })
              .catch((error2: unknown) => {
                if (isShareAbortError(error2)) return;
                fallbackChannelShare(caption);
              });
            return;
          }
        }

        fallbackChannelShare(caption);
      });
  }

  function shareVia(channel: ShareChannel) {
    const caption = captionText.trim();
    const openChannel = () => {
      const url = buildChannelShareUrl(channel, caption, link);
      window.open(url, "_blank", "noopener");
      setShowChannels(false);
    };

    // IG/TikTok have no web intent with prefilled caption — copy first, then open app/site.
    if (channelNeedsClipboardFirst(channel)) {
      void copyShareCaption(caption).finally(openChannel);
      return;
    }

    openChannel();
  }

  function renderChannelPicker(compact: boolean) {
    const icon = compact ? 20 : 22;
    const cell = compact
      ? "flex flex-col items-center gap-1 py-3 transition-colors"
      : "flex flex-col items-center gap-1.5 py-3.5 transition-colors";
    const label = "text-[10px] font-semibold text-ink";

    return (
      <>
        <div
          className={compact ? "fixed inset-0 z-40" : "fixed inset-0 z-10"}
          onClick={() => setShowChannels(false)}
        />
        <div
          className={
            compact
              ? "absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[70vh] overflow-y-auto overflow-hidden rounded-[18px] border border-line bg-surface shadow-xl"
              : "absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[70vh] overflow-y-auto overflow-hidden rounded-[18px] border border-line bg-surface shadow-xl"
          }
        >
          <div className="border-b border-line px-3 py-2.5 text-center text-[11px] font-bold text-muted">
            {shareCaptionCopied
              ? "Caption + link tersalin — pilih channel"
              : "Bagikan via"}
          </div>
          <div className="grid grid-cols-4 divide-x divide-y divide-line">
            <button type="button" onClick={() => shareVia("wa")} className={`${cell} text-[#25D366] hover:bg-[#25D366]/10`}>
              <WhatsAppSolid size={compact ? 22 : 24} />
              <span className={label}>{compact ? "WA" : "WhatsApp"}</span>
            </button>
            <button type="button" onClick={() => shareVia("tg")} className={`${cell} text-[#229ED9] hover:bg-[#229ED9]/10`}>
              <Telegram size={icon} />
              <span className={label}>{compact ? "TG" : "Telegram"}</span>
            </button>
            <button type="button" onClick={() => shareVia("fb")} className={`${cell} text-[#1877F2] hover:bg-[#1877F2]/10`}>
              <FacebookSolid size={compact ? 22 : 24} />
              <span className={label}>Facebook</span>
            </button>
            <button type="button" onClick={() => shareVia("ig")} className={`${cell} text-[#E4405F] hover:bg-[#E4405F]/10`}>
              <InstagramSolid size={compact ? 22 : 24} />
              <span className={label}>{compact ? "IG" : "Instagram"}</span>
            </button>
            <button type="button" onClick={() => shareVia("tt")} className={`${cell} text-ink hover:bg-ink/10`}>
              <TikTokSolid size={compact ? 22 : 24} />
              <span className={label}>TikTok</span>
            </button>
            <button type="button" onClick={() => shareVia("threads")} className={`${cell} text-ink hover:bg-ink/10`}>
              <Threads size={icon} />
              <span className={label}>Threads</span>
            </button>
            <button type="button" onClick={() => shareVia("x")} className={`${cell} text-ink hover:bg-ink/10`}>
              <XTwitter size={icon} />
              <span className={label}>{compact ? "X" : "X / Twitter"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void copyShareCaption(captionText.trim());
                setShowChannels(false);
              }}
              className={`${cell} text-teal-deep hover:bg-teal-deep/10`}
            >
              <Copy size={icon} />
              <span className={label}>{compact ? "Salin" : "Salin teks"}</span>
            </button>
          </div>
          <div className="border-t border-line px-3 py-2 text-center text-[10px] leading-snug text-muted">
            IG & TikTok: caption disalin otomatis — tempel di post/video.
          </div>
        </div>
      </>
    );
  }

  useImperativeHandle(ref, () => ({ share: handleShare }));

  function downloadFiles(files: File[]) {
    files.forEach((f, i) => {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      const ext = f.type.startsWith("video/")
        ? f.name.split(".").pop() || "mp4"
        : "jpg";
      a.download = files.length > 1 ? `unit-${i + 1}.${ext}` : `unit.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleDownload() {
    downloadFiles(composedFiles);
  }

  const backHref = embedded
    ? "#simulasi-kredit"
    : getCatalogReturnHref(searchParams.toString());
  const aiActiveUrl = activeMedia?.kind === "image" && aiPreviewMode === "ai"
    ? aiBackgroundUrls[activeMedia.id]
    : undefined;
  const activeUrl = activeMedia?.kind === "video"
    ? mobixMedia(activeMedia.url)
    : aiActiveUrl ?? mobixImage(activeMedia?.url, MOBIX_SHARE_WIDTH);
  const activePlaceholder = activeMedia?.kind === "image"
    ? mobixImage(activeMedia.url, MOBIX_SHARE_WIDTH)
    : undefined;
  const priceDelta = unit && sharePrice ? sharePrice - unit.harga : 0;
  const canGenerateAiBackground =
    Boolean(unit) && selectedImageMedia.length > 0 && aiBackgroundStatus !== "generating";
  const selectedAiBackgroundCount = selectedImageMedia.filter((media) => aiBackgroundUrls[media.id]).length;
  const selectedAiBackgroundComplete =
    selectedImageMedia.length > 0 && selectedAiBackgroundCount === selectedImageMedia.length;
  const detailSpecs = unit ? [
    { label: "Transmisi", value: titleCase(unit.transmisi || "-") },
    { label: "Kilometer", value: formatOdometer(unit.odometer) },
    { label: "Kategori", value: titleCase(unit.category || "-") },
    { label: "Tahun", value: String(unit.year) },
    { label: "Warna", value: titleCase(unit.color || "-") },
    { label: "Plat", value: unit.plate_no || "-" },
  ] : [];
  const unitDocuments = Object.entries(unit?.kelengkapan_dokumen ?? {});
  const similarUnits = (unit?.harga_sejenis ?? []).slice(0, 5).map(toCardUnit);

  if (controllerOnly) return null;

  return (
    <AppShell overlay={embedded} bare={embedded}>
      {/* sheet */}
      <div className={`min-h-[560px] bg-surface-2 px-4 ${embedded ? "pb-24 pt-[18px]" : "pb-[120px] pt-[18px]"}`}>
        {/* shareable preview */}
        <div className="relative mb-[18px] overflow-hidden rounded-[18px] border border-line bg-surface">
          {activeMedia?.kind === "video" ? (
            <div className="relative aspect-video bg-black">
              <video
                className="h-full w-full object-contain"
                src={activeUrl}
                controls
                playsInline
                preload="metadata"
              />
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-surface">
                <Play size={13} />
                Video
              </div>
            </div>
          ) : (
          <Photo
            large
            className="aspect-video"
            src={activeUrl}
            placeholderSrc={activePlaceholder}
            alt={unit?.nama}
          >
            {unit && (
              <div className="absolute bottom-3 left-3 rounded-lg bg-ink/85 px-3 py-1.5 text-[15px] font-bold text-surface">
                Rp {formatJt(sharePrice || unit.harga)}
                {shareHasFinancing && <> · {paymentLabel} {formatJt(paymentValue)}</>}
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleGenerateAiBackground(selectedAiBackgroundComplete)}
              disabled={!canGenerateAiBackground}
              className="absolute right-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/90 px-3 text-[11px] font-bold text-teal-deep shadow-sm backdrop-blur disabled:opacity-60"
            >
              <Sparkles size={13} />
              {aiBackgroundStatus === "generating"
                ? "Memproses..."
                : selectedAiBackgroundComplete
                  ? "Foto AI ✓"
                  : "Foto AI"}
            </button>
          </Photo>
          )}
          {embedded && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Kembali ke detail unit"
              className="absolute left-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur"
            >
              <ChevronLeft />
            </button>
          ) : (
            <Link
              href={backHref}
              aria-label="Kembali"
              className="absolute left-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-ink no-underline backdrop-blur"
            >
              <ChevronLeft />
            </Link>
          )}
          <div className="relative px-3.5 py-3">
            {loading || !unit ? (
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            ) : (
              <>
                <textarea
                  value={captionText}
                  onChange={(event) => setCaptionText(event.target.value)}
                  rows={6}
                  aria-label="Caption share unit"
                  className="min-h-[132px] w-full resize-y bg-transparent pr-9 text-[12px] leading-[1.65] text-mid outline-none"
                />
                <button
                  type="button"
                  onClick={handleCaptionAiHelp}
                  disabled={captionSuggesting}
                  aria-label="Buat caption dengan AI"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-teal-tint-border bg-teal-tint text-teal-deep disabled:opacity-50"
                >
                  <Sparkles size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* gallery picker – multi-select */}
        {mediaItems.length > 1 && (
          <div className="mb-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-bold text-muted">
                Pilih foto/video yang akan dishare
              </div>
              <div className="text-right text-[11px] font-bold text-teal-deep">
                {selectedMediaLabel}
              </div>
            </div>
            <div className="scroll-x flex gap-2 overflow-x-auto pb-1">
              {mediaItems.map((media, i) => {
                const isSelected = selectedIdxes.includes(i);
                return (
                  <button
                    key={media.id}
                    onClick={() => handleGalleryTap(i)}
                    className={`relative h-[60px] flex-[0_0_80px] overflow-hidden rounded-[10px] border-2 transition-all ${
                      isSelected
                        ? "border-teal-deep shadow-sm"
                        : "border-transparent opacity-60"
                    }`}
                  >
                    {media.kind === "image" ? (
                      <Photo
                        className="h-full w-full"
                        src={mobixImage(media.url)}
                        alt=""
                      />
                    ) : (
                      <>
                        <video
                          className="h-full w-full bg-black object-cover"
                          src={mobixMedia(media.url)}
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                          <Play size={18} />
                        </span>
                      </>
                    )}
                    {isSelected && (
                      <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-deep">
                        <Check size={9} strokeWidth={2.8} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 text-[11px] text-muted">
              (klik media untuk share lebih dari 1)
            </div>
            {isMixedMediaSelected && (
              <div className="mt-1.5 rounded-lg bg-teal-tint px-2.5 py-2 text-[11px] font-semibold text-teal-deep">
                WhatsApp membatasi foto+video dalam satu share. Bagikan bertahap: video + caption dulu, lalu foto.
              </div>
            )}
          </div>
        )}

        {/* builder price — caption hanya berubah setelah tombol centang ditekan */}
        <div className="mb-3 rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="share-builder-price" className="text-[13px] font-semibold text-mid">
              Pengaturan harga
            </label>
            {unit && (
              <span className="text-[10px] font-semibold text-muted">
                Min. {formatRupiah(minBuilderPrice(unit.harga))}
              </span>
            )}
          </div>
          {loading || !unit ? (
            <Skeleton className="h-11 w-full" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="mr-1.5 text-[13px] font-semibold text-muted">Rp</span>
                <input
                  id="share-builder-price"
                  type="text"
                  inputMode="numeric"
                  value={priceInput}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/\D/g, "");
                    setPriceInput(raw ? new Intl.NumberFormat("id-ID").format(Number(raw)) : "");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyBuilderPrice();
                  }}
                  aria-label="Harga jual builder"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-ink outline-none"
                />
              </div>
              <button
                type="button"
                onClick={applyBuilderPrice}
                aria-label="Terapkan harga ke caption"
                title="Terapkan harga ke caption"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal text-ink"
              >
                <Check size={18} strokeWidth={2.8} />
              </button>
            </div>
          )}
          {unit && priceDelta !== 0 && (
            <div className="mt-1.5 text-[10px] text-muted">
              Harga asli {formatRupiah(unit.harga)} · harga aktif {formatRupiah(sharePrice)}
            </div>
          )}
        </div>

        {/* est. komisi */}
        <div className="mb-[18px] flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div>
            <div className="text-[13px] font-semibold text-mid">Est. komisi kamu</div>
            {unit && priceDelta !== 0 && (
              <div className="mt-0.5 text-[10px] text-muted">
                {priceDelta > 0
                  ? `Selisih +${formatRupiah(priceDelta)}`
                  : `Selisih -${formatRupiah(Math.abs(priceDelta))}`}
              </div>
            )}
          </div>
          {loading || !unit ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <span
              className={`text-[15px] font-bold ${
                shareCommission >= 2_000_000 ? "text-teal-deep" : "text-ink"
              }`}
            >
              {formatRupiah(shareCommission)}
            </span>
          )}
        </div>

        {/* simulasi kredit — collapsible seperti detail unit */}
        {unit && (
          <div className="mb-[18px]">
            <CreditSimulationBox
              unit={unit}
              price={sharePrice || unit.harga}
              initialTenor={positiveParamNumber(searchParams, "tenor") ?? 60}
              initialDpPercent={positiveParamNumber(searchParams, "dp_pct") ?? undefined}
              onSimulationChange={handleSimulationChange}
            />
            {!salesContactRequired && (
              <button
                type="button"
                onClick={applyCreditSimulation}
                disabled={!liveSimulation?.canShare}
                className="-mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-b-[18px] border border-t-0 border-line bg-teal px-4 text-[12px] font-extrabold text-ink disabled:bg-field disabled:text-muted"
              >
                <Check size={16} strokeWidth={2.8} />
                {liveSimulation?.canShare
                  ? "Terapkan simulasi ke caption"
                  : "Menunggu hasil simulasi"}
              </button>
            )}
          </div>
        )}

        {unit && (
          <div className="mb-[18px] overflow-hidden rounded-[18px] border border-line bg-surface">
            <button
              type="button"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
              className="flex min-h-[64px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex-1 text-[15px] font-extrabold text-ink">Cek detail unit lengkapnya</span>
              <span className={`text-[22px] leading-none text-muted transition-transform ${detailsOpen ? "rotate-90" : ""}`}>›</span>
            </button>

            {detailsOpen && (
              <div className="border-t border-line pb-1">
                <div className="px-3.5 py-4">
                  <div className="grid grid-cols-3 gap-2">
                    {detailSpecs.map((spec) => (
                      <div key={spec.label} className="rounded-xl bg-field p-3 text-center">
                        <div className="text-[11px] text-muted">{spec.label}</div>
                        <div className="mt-0.5 truncate text-[13px] font-bold text-ink">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {unitDocuments.length > 0 && (
                  <div className="px-[18px] pb-4">
                    <div className="mb-2 text-[15px] font-extrabold text-ink">Kelengkapan dokumen</div>
                    <div className="flex flex-col gap-2">
                      {unitDocuments.map(([key, value]) => {
                        const isBpkb = key.toLowerCase() === "bpkb";
                        const available = isBpkb || (/\b(ada|tersedia)\b/i.test(value) && !/^(tidak|belum)\b/i.test(value));
                        const displayValue = isBpkb ? maskBpkbName(value) : value;
                        return (
                          <div key={key} className="flex items-center gap-2.5 rounded-xl bg-field px-3.5 py-2.5">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${available ? "bg-teal text-ink" : "bg-danger-bg text-danger"}`}>
                              {available ? <Check size={11} /> : <Close size={10} />}
                            </span>
                            <span className="text-[13px] font-semibold uppercase text-ink">{key}</span>
                            <span className="ml-auto text-right text-[12px] text-muted">
                              {isBpkb && /^(tidak|belum)\b/i.test(value) ? "Ada" : displayValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {unit.deskripsi && (
                  <div className="px-[18px] pb-4">
                    <div className="mb-2 text-[15px] font-extrabold text-ink">Deskripsi unit</div>
                    <p className="m-0 whitespace-pre-line text-[13px] leading-[1.6] text-mid">{unit.deskripsi}</p>
                  </div>
                )}

                {similarUnits.length > 0 && (
                  <div className="px-[18px] pb-4">
                    <div className="mb-2 text-[15px] font-extrabold text-ink">Rekomendasi lain</div>
                    <div className="flex flex-col gap-2.5">
                      {similarUnits.map((similar) => <UnitRow key={similar.id} unit={similar} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* secondary actions */}
        <div className="flex flex-col gap-2">
          {embedded && (
            <div className="relative mb-1">
              {showChannels && renderChannelPicker(false)}
              <button
                type="button"
                onClick={handleShare}
                disabled={!unit || composing}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-ink px-3 py-3 text-[14px] font-bold text-surface disabled:opacity-50"
              >
                {composing ? (
                  <span className="text-[13px] opacity-80">Menyiapkan media...</span>
                ) : shareCaptionCopied ? (
                  <>
                    <Check className="shrink-0" size={16} strokeWidth={2.4} />
                    <span>Caption + link tersalin</span>
                  </>
                ) : (
                  <>
                    <ShareArrow className="shrink-0" size={16} />
                    <span>{shareButtonLabel}</span>
                    {selectedIdxes.length > 0 && !pendingShareStep && (
                      <span className="text-[12px] opacity-80">({selectedMediaButtonLabel})</span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!unit || composedFiles.length === 0}
            className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5 text-ink disabled:opacity-50"
          >
            <Download className="text-ink" />
            <span className="flex-1 text-left text-[14px] font-semibold">
              Download media siap-posting
            </span>
            <span className="text-[12px] font-bold text-teal-deep">
              {composedFiles.length > 1 ? `${composedFiles.length} file` : "File"}
            </span>
          </button>
        </div>
      </div>

      {/* sticky action bar — selalu on top (fixed), pola sama seperti detail unit */}
      {!embedded && (
        <div className="fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-50 grid w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 grid-cols-[minmax(0,1fr)_56px] gap-2 rounded-3xl border border-line bg-surface p-2.5 shadow-nav">
          <div className="relative min-w-0">
            {showChannels && renderChannelPicker(true)}
            <button
              type="button"
              onClick={handleShare}
              disabled={!unit || composing}
              className="flex h-12 min-w-0 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-[13px] font-bold text-surface disabled:opacity-50"
            >
              {composing ? (
                <span className="truncate text-[12px] opacity-80">Menyiapkan media...</span>
              ) : shareCaptionCopied ? (
                <>
                  <Check className="shrink-0" size={14} strokeWidth={2.4} />
                  <span className="truncate">Caption + link tersalin</span>
                </>
              ) : pendingShareStep ? (
                <>
                  <ShareArrow className="shrink-0" size={14} />
                  <span className="truncate">{shareButtonLabel}</span>
                </>
              ) : (
                <>
                  <span className="truncate">Share ke social media</span>
                  <ShareArrow size={14} />
                </>
              )}
            </button>
          </div>
          <ContactActionMenu
            adminMessage={unitAdminMessage}
            calculationMessage={unitCalculationMessage}
            calculationHref={salesContactRequired ? jasmineCalculationHref : undefined}
            adminLabel="Tanya Admin"
            calculationLabel={salesContactRequired ? "Tanya Opsi Pembiayaan" : "Minta Hitungan"}
            buttonClassName="flex h-12 w-full items-center justify-center rounded-2xl border border-teal-tint-border bg-teal text-ink"
          />
        </div>
      )}
    </AppShell>
  );
});
