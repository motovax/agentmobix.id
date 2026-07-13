import { useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { AppShell } from "../components/AppShell";
import { Photo, Skeleton } from "../components/ui";
import {
  Close,
  ShareArrow,
  Copy,
  Download,
  WhatsAppSolid,
  Telegram,
  XTwitter,
  Check,
  Sparkles,
  Play,
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
  titleCase,
  type GalleryItem,
  type ProductDetail,
  type VideoItem,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatJt, formatRupiah } from "../lib/format";
import { estimateBuilderCommission } from "../lib/commission";

/* ---- business logic ---- */

type ShareMedia =
  | { kind: "image"; id: string; url: string; item: GalleryItem }
  | { kind: "video"; id: string; url: string; item: VideoItem };

type PendingShareStep = {
  files: File[];
  label: string;
  includeCaption?: boolean;
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

export function ShareSheet() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const slug = searchParams.get("u") ?? "";
  const { data: unit, loading } = useAsync(() => fetchUnitDetail(slug), [slug]);

  const [copied, setCopied] = useState<"" | "caption" | "link">("");
  const [captionText, setCaptionText] = useState("");
  const [captionSuggesting, setCaptionSuggesting] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [shareCaptionCopied, setShareCaptionCopied] = useState(false);
  const [pendingShareStep, setPendingShareStep] = useState<PendingShareStep | null>(null);

  // multi-select share media
  const [selectedIdxes, setSelectedIdxes] = useState<number[]>([0]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // canvas-composed files without price/TDP overlay — for download
  const [composedFiles, setComposedFiles] = useState<File[]>([]);
  const [composing, setComposing] = useState(false);

  // canvas-composed files without overlay — for social media share
  const [shareFiles, setShareFiles] = useState<File[]>([]);
  const [shareComposing, setShareComposing] = useState(false);
  const [shareFilesSignature, setShareFilesSignature] = useState("");

  const blobCache = useRef<Map<string, Blob>>(new Map());
  const captionSuggestionIndex = useRef(0);

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
      : "Bagikan Sekarang";
  const isDpMinimShare = searchParams.get("sim") === "dpminim";
  const shareTenor = positiveParamNumber(searchParams, "tenor") ?? 60;
  const shareTdp = positiveParamNumber(searchParams, "tdp") ?? unit?.tdp ?? 0;
  const shareCicilan = positiveParamNumber(searchParams, "cicilan") ?? unit?.cicilan ?? 0;
  const shareDp = positiveParamNumber(searchParams, "dp") ?? null;
  const shareDpPercent = positiveParamNumber(searchParams, "dp_pct") ?? null;
  const shareCreditPrice = positiveParamNumber(searchParams, "harga_kredit") ?? unit?.harga_kredit ?? null;
  const sharePrice = positiveParamNumber(searchParams, "harga") ?? unit?.harga ?? 0;
  const captionPrice = isDpMinimShare ? sharePrice : (shareCreditPrice ?? sharePrice ?? unit?.harga ?? 0);
  const paymentLabel = isDpMinimShare ? "DP Konsumen" : "TDP";
  const paymentValue = isDpMinimShare && shareDp ? shareDp : shareTdp;
  const shareCommission =
    positiveParamNumber(searchParams, "komisi") ??
    (unit && sharePrice ? estimateBuilderCommission(unit.harga, sharePrice) : 0);
  const autoCaption = unit
    ? `${unit.nama}, KM ${Math.round(
        unit.odometer / 1000,
      )}rb. Harga ${formatRupiah(captionPrice)}. ${paymentLabel} ${formatJt(paymentValue)}, cicilan ${formatJt(
        shareCicilan,
      )}/bln tenor ${shareTenor} bulan. Unit ready di cabang ${titleCase(
        unit.lokasi || "Mobix",
      )}, bisa cek langsung. Chat saya ya 🙌`
    : "";

  // init when unit loads
  useEffect(() => {
    if (!unit) return;
    setSelectedIdxes([0]);
    setPreviewIdx(0);
    setCaptionText(autoCaption);
    setPendingShareStep(null);
  }, [unit?.id, autoCaption]);

  // fetch raw blobs (cached) + compose download files whenever selection changes
  useEffect(() => {
    if (!unit || !mediaItems.length) return;
    let alive = true;
    setComposing(true);

    const selectedMedia = selectedIdxes
      .map((i) => mediaItems[i])
      .filter(Boolean);
    const selectedGallery = selectedMedia
      .filter((media): media is Extract<ShareMedia, { kind: "image" }> => media.kind === "image")
      .map((media) => media.item);
    const selectedVideos = selectedMedia
      .filter((media): media is Extract<ShareMedia, { kind: "video" }> => media.kind === "video")
      .map((media) => media.item);

    async function run() {
      const imageFiles = selectedGallery.length
        ? await buildShareImages(
        selectedGallery,
        sharePrice,
        shareTdp,
        false,
            blobCache.current,
          )
        : [];
      const videoFiles = selectedVideos.length
        ? await buildShareVideos(selectedVideos, blobCache.current)
        : [];
      if (!alive) return;

      setComposedFiles([...imageFiles, ...videoFiles]);
      setComposing(false);
    }

    run().catch(() => {
      if (alive) setComposing(false);
    });

    return () => {
      alive = false;
    };
  }, [unit, selectedIdxes.join(","), sharePrice, shareTdp]); // eslint-disable-line react-hooks/exhaustive-deps

  async function prepareShareFiles() {
    if (!unit || !mediaItems.length) return [];

    const selectedMedia = selectedIdxes
      .map((i) => mediaItems[i])
      .filter(Boolean);
    const selectedGallery = selectedMedia
      .filter((media): media is Extract<ShareMedia, { kind: "image" }> => media.kind === "image")
      .map((media) => media.item);
    const selectedVideos = selectedMedia
      .filter((media): media is Extract<ShareMedia, { kind: "video" }> => media.kind === "video")
      .map((media) => media.item);
    const signature = `${selectedIdxes.join(",")}:${sharePrice}:${shareTdp}`;

    if (shareFiles.length > 0 && shareFilesSignature === signature) {
      return shareFiles;
    }

    setShareComposing(true);

    try {
      const imageFiles = selectedGallery.length
        ? await buildShareImages(
            selectedGallery,
            sharePrice,
            shareTdp,
            false,
            blobCache.current,
          )
        : [];
      const videoFiles = selectedVideos.length
        ? await buildShareVideos(selectedVideos, blobCache.current)
        : [];
      const files = [...imageFiles, ...videoFiles];

      setShareFiles(files);
      setShareFilesSignature(signature);
      return files;
    } finally {
      setShareComposing(false);
    }
  }

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

  const link = unit ? `mobix.id/u/${unit.plate_no}` : "mobix.id";

  function showCopiedState(what: "caption" | "link", fromShare = false) {
    setCopied(what);
    if (fromShare) setShareCaptionCopied(true);
    window.setTimeout(() => {
      setCopied("");
      if (fromShare) setShareCaptionCopied(false);
    }, fromShare ? 2500 : 1500);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function copy(what: "caption" | "link", text: string) {
    if (await copyToClipboard(text)) {
      showCopiedState(what);
    }
  }

  async function sharePreparedFiles(
    files: File[],
    title: string,
    caption: string,
  ) {
    if (!navigator.share || files.length === 0) return false;

    const payloadWithCaption: ShareData = {
      files,
      title,
      ...(caption ? { text: caption } : {}),
    };
    const payloadFilesOnly: ShareData = { files, title };
    const payload = navigator.canShare?.(payloadWithCaption)
      ? payloadWithCaption
      : navigator.canShare?.(payloadFilesOnly)
        ? payloadFilesOnly
        : null;

    if (!payload) return false;

    if (caption) {
      void copyToClipboard(caption).then((ok) => {
        if (ok) showCopiedState("caption", true);
      });
    }

    await navigator.share(payload);
    return true;
  }

  async function handleCaptionAiHelp() {
    if (!unit || captionSuggesting) return;
    setCaptionSuggesting(true);

    const styleHint =
      CAPTION_STYLE_HINTS[captionSuggestionIndex.current % CAPTION_STYLE_HINTS.length];
    const color = titleCase(unit.color || "");
    const branch = titleCase(unit.lokasi || "Mobix");
    const km = `${Math.round(unit.odometer / 1000)}rb`;
    const creditPrice = formatRupiah(captionPrice);
    const payment = formatJt(paymentValue);
    const installment = formatJt(shareCicilan);
    const category =
      unit.category && unit.category.length <= 4
        ? unit.category.toUpperCase()
        : unit.category
          ? titleCase(unit.category)
          : "mobil";
    const dpInfo =
      shareDp && shareDpPercent
        ? ` DP ${formatRupiah(shareDp)} (${Math.round(shareDpPercent * 10) / 10}%).`
        : "";
    const colorInfo = color ? ` warna ${color}` : "";
    const specs = [
      unit.year ? `tahun ${unit.year}` : "",
      unit.transmisi ? `transmisi ${titleCase(unit.transmisi)}` : "",
      color ? `warna ${color}` : "",
      `KM ${km}`,
    ].filter(Boolean).join(", ");

    const variants = isDpMinimShare
      ? [
          `${unit.nama}${colorInfo}, KM ${km}, ready di ${branch}. ${paymentLabel} ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan. Chat saya untuk cek unitnya.`,
          `Mau ${category} dengan paket DP minim? ${unit.nama} ready di ${branch}: ${paymentLabel} ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan.`,
          `${unit.nama} opsi menarik buat upgrade: ${specs}. ${paymentLabel} ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan; cek unitnya di ${branch}.`,
        ]
      : [
          `${unit.nama}${colorInfo}, KM ${km}, incaran menarik buat yang mau ${category} siap dilirik. Harga kredit ${creditPrice}, TDP ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan; ready di ${branch}, chat saya untuk cek unit.`,
          `Mau ${category} yang paketnya jelas? ${unit.nama} ready di ${branch}: harga kredit ${creditPrice}, TDP ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan. Minat, langsung chat saya.`,
          `${unit.nama} opsi manis buat upgrade tanpa ribet: ${specs}. Harga kredit ${creditPrice}, TDP ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan; cek unitnya di ${branch}.`,
          `${unit.nama}${colorInfo} cepat bikin orang melirik, apalagi paketnya sudah jelas: harga kredit ${creditPrice}, TDP ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan. Chat saya kalau mau cek.`,
          `${unit.nama} ready di ${branch}, paket kreditnya ringan buat mulai dilirik: harga kredit ${creditPrice}, TDP ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan.${dpInfo} Mau saya bantu cek unit?`,
          `Cari ${category} praktis dan menarik? ${unit.nama}${colorInfo}, KM ${km}, bisa jadi pilihan pas dengan harga kredit ${creditPrice}, TDP ${payment}, cicilan ${installment}/bln tenor ${shareTenor} bulan.`,
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
        harga_kredit: isDpMinimShare ? undefined : captionPrice,
        tdp: shareTdp,
        cicilan: shareCicilan,
        tenor: shareTenor,
        dp: shareDp ?? undefined,
        dp_pct: shareDpPercent ?? undefined,
        caption_saat_ini: captionText || autoCaption,
        style_hint: styleHint,
      });
      setCaptionText(aiCaption);
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
    const share = async () => {
      const caption = captionText.trim();
      const title = unit?.nama ?? "Mobix";

      if (pendingShareStep) {
        const shared = await sharePreparedFiles(
          pendingShareStep.files,
          title,
          pendingShareStep.includeCaption === false ? "" : caption,
        );
        if (shared) {
          setPendingShareStep(null);
          return;
        }
      }

      const filesToShare = await prepareShareFiles();
      const imageFiles = filesToShare.filter((file) => file.type.startsWith("image/"));
      const videoFiles = filesToShare.filter((file) => file.type.startsWith("video/"));
      const hasMixedMediaFiles = imageFiles.length > 0 && videoFiles.length > 0;

      if (hasMixedMediaFiles) {
        const shared = await sharePreparedFiles(videoFiles, title, caption);
        if (shared) {
          setPendingShareStep({
            files: imageFiles,
            label: imageFiles.length > 1
              ? `Lanjut bagikan ${imageFiles.length} foto`
              : "Lanjut bagikan foto",
            includeCaption: false,
          });
          return;
        }
        if (caption && (await copyToClipboard(caption))) {
          showCopiedState("caption", true);
        }
        setShowChannels((v) => !v);
        return;
      }

      if (filesToShare.length > 0 && await sharePreparedFiles(filesToShare, title, caption)) {
        return;
      }

      if (navigator.share && !filesToShare.length) {
        if (caption && (await copyToClipboard(caption))) {
          showCopiedState("caption", true);
        }
        await navigator.share({
          title,
          text: caption,
        });
        return;
      }

      if (caption && (await copyToClipboard(caption))) {
        showCopiedState("caption", true);
      }

      setShowChannels((v) => !v);
    };

    void share().catch(() => {
      setShowChannels((v) => !v);
    });
  }

  function shareVia(channel: "wa" | "tg" | "x") {
    const encoded = encodeURIComponent(captionText);
    const urls: Record<string, string> = {
      wa: `https://wa.me/?text=${encoded}`,
      tg: `https://t.me/share/url?url=${encoded}`,
      x: `https://x.com/intent/tweet?text=${encoded}`,
    };
    window.open(urls[channel], "_blank", "noopener");
    setShowChannels(false);
  }

  function handleDownload() {
    composedFiles.forEach((f, i) => {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      const ext = f.type.startsWith("video/")
        ? f.name.split(".").pop() || "mp4"
        : "jpg";
      a.download = composedFiles.length > 1 ? `unit-${i + 1}.${ext}` : `unit.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const backHref = unit ? `/unit/${unit.slug}` : "/katalog";
  const activeUrl = activeMedia?.kind === "video"
    ? mobixMedia(activeMedia.url)
    : mobixImage(activeMedia?.url, MOBIX_SHARE_WIDTH);
  const activePlaceholder = activeMedia?.kind === "image"
    ? mobixImage(activeMedia.url, MOBIX_SHARE_WIDTH)
    : undefined;
  const priceDelta = unit && sharePrice ? sharePrice - unit.harga : 0;

  return (
    <AppShell bg="bg-ink">
      {/* backdrop */}
      <div className="pt-10 text-center">
        <Link
          href={backHref}
          aria-label="Tutup"
          className="mb-[18px] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.12] text-surface no-underline"
        >
          <Close />
        </Link>
        <div className="text-[13px] text-[#A4D7D7]">Bagikan unit ini ke jaringan kamu</div>
      </div>

      {/* sheet */}
      <div className="mt-5 min-h-[560px] rounded-t-[28px] bg-surface-2 px-4 pb-5 pt-[18px]">
        <div className="mx-auto mb-[18px] h-1 w-10 rounded-full bg-[#D4DEDF]" />

        {/* shareable preview */}
        <div className="mb-[18px] overflow-hidden rounded-[18px] border border-line bg-surface">
          {activeMedia?.kind === "video" ? (
            <div className="relative aspect-video bg-black">
              <video
                className="h-full w-full object-contain"
                src={activeUrl}
                controls
                playsInline
                preload="metadata"
              />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-surface">
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
                Rp {formatJt(sharePrice || unit.harga)} · {paymentLabel} {formatJt(paymentValue)}
              </div>
            )}
            <img
              src="/mobix-logo.png"
              alt="Mobix"
              className="absolute right-3 top-3 h-[18px] w-auto opacity-90 [filter:brightness(0)_invert(1)]"
            />
          </Photo>
          )}
          <div className="px-3.5 py-3">
            {loading || !unit ? (
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            ) : (
              <>
                <div className="text-[14px] font-bold">{unit.nama}</div>
                <div className="mt-0.5 text-[12px] text-muted">
                  Cicilan dari {formatRupiah(shareCicilan)}/bln · {shareTenor} bln ·{" "}
                  {titleCase(unit.lokasi || "Mobix")}
                </div>
                {(shareCreditPrice || shareDp) && (
                  <div className="mt-1 text-[11px] text-muted">
                    {!isDpMinimShare && shareCreditPrice && <>Harga kredit {formatRupiah(shareCreditPrice)}</>}
                    {!isDpMinimShare && shareCreditPrice && shareDp && " · "}
                    {shareDp && (
                      <>
                        {isDpMinimShare ? "DP Konsumen" : "DP"} {formatRupiah(shareDp)}
                        {shareDpPercent && ` (${Math.round(shareDpPercent * 10) / 10}%)`}
                      </>
                    )}
                  </div>
                )}
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

        {/* caption – editable */}
        <div className="mb-[18px] rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted">
              Caption (bisa diedit)
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCaptionAiHelp}
                disabled={!unit || captionSuggesting}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-indigo-50 px-2 text-[11px] font-bold text-indigo-700 disabled:opacity-50"
              >
                <Sparkles size={13} />
                {captionSuggesting ? "Mengolah..." : "Bantuan AI"}
              </button>
              {unit && captionText !== autoCaption && (
                <button
                  onClick={() => setCaptionText(autoCaption)}
                  className="text-[11px] font-semibold text-muted underline"
                >
                  Reset
                </button>
              )}
              <button
                onClick={() => copy("caption", captionText)}
                disabled={!unit}
                className="text-[11px] font-bold text-teal-deep disabled:opacity-40"
              >
                {copied === "caption" ? "Tersalin ✓" : "Salin"}
              </button>
            </div>
          </div>
          {loading || !unit ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : (
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              rows={4}
              className="min-h-[96px] w-full resize-y bg-transparent text-[12px] leading-[1.55] text-mid outline-none"
            />
          )}
        </div>

        {/* builder price */}
        <div className="mb-3 flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div>
            <div className="text-[13px] font-semibold text-mid">
              Harga jual builder
            </div>
            {unit && priceDelta !== 0 && (
              <div className="mt-0.5 text-[10px] text-muted">
                Harga asli {formatRupiah(unit.harga)}
              </div>
            )}
          </div>
          {loading || !unit ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <span className="text-[15px] font-bold text-ink">
              {formatRupiah(sharePrice || unit.harga)}
            </span>
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

        {/* share button */}
        <div className="relative mb-[18px]">
          {showChannels && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowChannels(false)}
              />
              <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-[18px] border border-line bg-surface shadow-xl">
                <div className="border-b border-line px-4 py-3 text-center text-[11px] font-bold text-muted">
                  Bagikan via
                </div>
                <div className="grid grid-cols-4 divide-x divide-line">
                  <button
                    onClick={() => shareVia("wa")}
                    className="flex flex-col items-center gap-1.5 py-4 text-[#25D366] transition-colors hover:bg-[#25D366]/10"
                  >
                    <WhatsAppSolid size={24} />
                    <span className="text-[10px] font-semibold text-ink">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => shareVia("tg")}
                    className="flex flex-col items-center gap-1.5 py-4 text-[#229ED9] transition-colors hover:bg-[#229ED9]/10"
                  >
                    <Telegram size={24} />
                    <span className="text-[10px] font-semibold text-ink">Telegram</span>
                  </button>
                  <button
                    onClick={() => shareVia("x")}
                    className="flex flex-col items-center gap-1.5 py-4 text-ink transition-colors hover:bg-ink/10"
                  >
                    <XTwitter size={24} />
                    <span className="text-[10px] font-semibold text-ink">X / Twitter</span>
                  </button>
                  <button
                    onClick={() => {
                      void copy("link", `https://${link}`);
                      setShowChannels(false);
                    }}
                    className="flex flex-col items-center gap-1.5 py-4 text-teal-deep transition-colors hover:bg-teal-deep/10"
                  >
                    <Copy size={24} />
                    <span className="text-[10px] font-semibold text-ink">Salin Link</span>
                  </button>
                </div>
              </div>
            </>
          )}
          <button
            onClick={handleShare}
            disabled={!unit || composing || shareComposing}
            className="flex min-h-[66px] w-full items-center justify-center gap-2.5 rounded-[18px] bg-teal-deep px-3 py-3.5 text-[15px] font-bold leading-tight text-surface disabled:opacity-50"
          >
            {(composing || shareComposing) ? (
              <span className="text-[13px] opacity-80">Menyiapkan media...</span>
            ) : pendingShareStep ? (
              <>
                <ShareArrow className="shrink-0" size={18} />
                <span className="min-w-0 text-center">{shareButtonLabel}</span>
              </>
            ) : shareCaptionCopied ? (
              <>
                <Check className="shrink-0" size={18} strokeWidth={2.4} />
                <span className="min-w-0 text-center">Caption tersalin</span>
              </>
            ) : (
              <>
                <ShareArrow className="shrink-0" size={18} />
                <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center">
                  <span>{shareButtonLabel}</span>
                  {selectedIdxes.length > 0 && (
                    <span className="text-[12px] opacity-80">
                      ({selectedMediaButtonLabel})
                    </span>
                  )}
                </span>
              </>
            )}
          </button>
        </div>

        {/* secondary actions */}
        <div className="flex flex-col gap-2">
          <button
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
    </AppShell>
  );
}
