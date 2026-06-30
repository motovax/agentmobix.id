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
} from "../components/icons";
import {
  fetchUnitDetail,
  mobixImage,
  mobixImageFetchable,
  titleCase,
  type ProductDetail,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatJt, formatRupiah } from "../lib/format";

/* ---- business logic ---- */

function komisiDeal(deal: number, asli: number): number {
  if (!deal || !asli) return 0;
  if (deal < asli) return 1_000_000;
  if (deal === asli) return 2_000_000;
  return deal - asli;
}

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

async function composeOverlay(
  rawBlob: Blob,
  unit: ProductDetail,
  dealHarga: number,
  includeOverlay = true,
  crop: "cover" | "contain" = "cover",
): Promise<File> {
  const bitmap = await createImageBitmap(rawBlob);
  const W = 1280,
    H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

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
    const text = `Rp ${formatJt(dealHarga)} · TDP ${formatJt(unit.tdp)}`;
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
    const lh = 28,
      lw = Math.round((lh * logoBitmap.width) / logoBitmap.height);
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
        resolve(new File([blob!], "unit.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.92,
    ),
  );
}

/* ---- component ---- */

export function ShareSheet() {
  const search = useSearch();
  const slug = new URLSearchParams(search).get("u") ?? "";
  const { data: unit, loading } = useAsync(() => fetchUnitDetail(slug), [slug]);

  const [copied, setCopied] = useState<"" | "caption" | "link">("");
  const [captionText, setCaptionText] = useState("");
  const [showChannels, setShowChannels] = useState(false);

  // multi-select gallery
  const [selectedIdxes, setSelectedIdxes] = useState<number[]>([0]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // editable price
  const [dealHarga, setDealHarga] = useState(0);
  const [priceInput, setPriceInput] = useState("");

  // canvas-composed files (with overlay — for preview & download)
  const [composedFiles, setComposedFiles] = useState<File[]>([]);
  const [composing, setComposing] = useState(false);

  // canvas-composed files without overlay — for social media share
  const [shareFiles, setShareFiles] = useState<File[]>([]);
  const [shareComposing, setShareComposing] = useState(false);

  const blobCache = useRef<Map<string, Blob>>(new Map());

  const gallery = unit?.galeri ?? [];
  const activeImg = gallery[previewIdx] ?? gallery[0];

  // init when unit loads
  useEffect(() => {
    if (!unit) return;
    setDealHarga(unit.harga);
    setPriceInput(new Intl.NumberFormat("id-ID").format(unit.harga));
    setSelectedIdxes([0]);
    setPreviewIdx(0);
    setCaptionText(
      `${unit.nama} tangan pertama, KM ${Math.round(unit.odometer / 1000)}rb. Cukup TDP ${formatJt(unit.tdp)}, cicilan ${formatJt(unit.cicilan)}/bln. Unit ready di cabang ${titleCase(unit.lokasi || "Mobix")}, bisa cek langsung. Chat saya ya 🙌`,
    );
  }, [unit?.id]);

  // fetch raw blobs (cached) + compose overlay whenever selection or price changes
  useEffect(() => {
    if (!unit || !gallery.length) return;
    const u = unit; // capture non-null for closure
    let alive = true;
    setComposing(true);

    const selectedGallery = selectedIdxes
      .map((i) => gallery[i])
      .filter(Boolean);

    async function run() {
      const blobs = await Promise.all(
        selectedGallery.map(async (g) => {
          if (blobCache.current.has(g.url)) return blobCache.current.get(g.url)!;
          const src = mobixImageFetchable(g.url);
          if (!src) return null;
          try {
            const r = await fetch(src);
            const blob = r.ok ? await r.blob() : null;
            if (blob) blobCache.current.set(g.url, blob);
            return blob;
          } catch {
            return null;
          }
        }),
      );

      const valid = blobs.filter(Boolean) as Blob[];
      if (!valid.length || !alive) return;

      const files = await Promise.all(
        valid.map((blob) => composeOverlay(blob, u, dealHarga)),
      );
      if (alive) {
        setComposedFiles(files);
        setComposing(false);
      }
    }

    run().catch(() => {
      if (alive) setComposing(false);
    });

    return () => {
      alive = false;
    };
  }, [unit, selectedIdxes.join(","), dealHarga]); // eslint-disable-line react-hooks/exhaustive-deps

  // compose share files WITHOUT price pill overlay — for social media
  useEffect(() => {
    if (!unit || !gallery.length) return;
    const u = unit;
    let alive = true;
    setShareComposing(true);

    const selectedGallery = selectedIdxes
      .map((i) => gallery[i])
      .filter(Boolean);

    async function run() {
      const blobs = await Promise.all(
        selectedGallery.map(async (g) => {
          if (blobCache.current.has(g.url)) return blobCache.current.get(g.url)!;
          const src = mobixImageFetchable(g.url);
          if (!src) return null;
          try {
            const r = await fetch(src);
            const blob = r.ok ? await r.blob() : null;
            if (blob) blobCache.current.set(g.url, blob);
            return blob;
          } catch {
            return null;
          }
        }),
      );

      const valid = blobs.filter(Boolean) as Blob[];
      if (!valid.length || !alive) return;

      const files = await Promise.all(
        valid.map((blob) => composeOverlay(blob, u, dealHarga, false, "contain")),
      );
      if (alive) {
        setShareFiles(files);
        setShareComposing(false);
      }
    }

    run().catch(() => {
      if (alive) setShareComposing(false);
    });

    return () => {
      alive = false;
    };
  }, [unit, selectedIdxes.join(","), dealHarga]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGalleryTap(i: number) {
    setPreviewIdx(i);
    setSelectedIdxes((prev) => {
      if (prev.includes(i)) {
        if (prev.length === 1) return prev; // keep at least one selected
        return prev.filter((x) => x !== i);
      }
      return [...prev, i].sort((a, b) => a - b);
    });
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const num = digits ? Number(digits) : 0;
    setPriceInput(new Intl.NumberFormat("id-ID").format(num));
    setDealHarga(num);
  }

  const link = unit ? `mobix.id/u/${unit.plate_no}` : "mobix.id";
  const autoCaption = unit
    ? `${unit.nama} tangan pertama, KM ${Math.round(
        unit.odometer / 1000,
      )}rb. Cukup TDP ${formatJt(unit.tdp)}, cicilan ${formatJt(
        unit.cicilan,
      )}/bln. Unit ready di cabang ${titleCase(
        unit.lokasi || "Mobix",
      )}, bisa cek langsung. Chat saya ya 🙌`
    : "";

  async function copy(what: "caption" | "link", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleShare() {
    const filesToShare = shareFiles.length > 0 ? shareFiles : composedFiles;
    const canShareFiles =
      filesToShare.length > 0 && !!navigator.canShare?.({ files: filesToShare });

    if (navigator.share && canShareFiles) {
      void navigator.share({
        files: filesToShare,
        text: captionText,
      });
      return;
    }
    setShowChannels((v) => !v);
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
      a.download = composedFiles.length > 1 ? `unit-${i + 1}.jpg` : "unit.jpg";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const backHref = unit ? `/unit/${unit.slug}` : "/katalog";
  const activeUrl = mobixImage(activeImg?.url);
  const komisi = unit ? komisiDeal(dealHarga, unit.harga) : 0;

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
          <Photo large className="aspect-video" src={activeUrl} alt={unit?.nama}>
            {unit && (
              <div className="absolute bottom-3 left-3 rounded-lg bg-ink/85 px-3 py-1.5 text-[15px] font-bold text-surface">
                Rp {formatJt(dealHarga || unit.harga)} · TDP {formatJt(unit.tdp)}
              </div>
            )}
            <img
              src="/mobix-logo.png"
              alt="Mobix"
              className="absolute right-3 top-3 h-[18px] w-auto opacity-90 [filter:brightness(0)_invert(1)]"
            />
          </Photo>
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
                  Cicilan dari {formatRupiah(unit.cicilan)}/bln · 60 bln ·{" "}
                  {titleCase(unit.lokasi || "Mobix")}
                </div>
              </>
            )}
          </div>
        </div>

        {/* gallery picker – multi-select */}
        {gallery.length > 1 && (
          <div className="mb-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-bold text-muted">
                Pilih foto yang akan dishare
              </div>
              {selectedIdxes.length > 1 && (
                <div className="text-[11px] font-bold text-teal-deep">
                  {selectedIdxes.length} foto dipilih
                </div>
              )}
            </div>
            <div className="scroll-x flex gap-2 overflow-x-auto pb-1">
              {gallery.map((g, i) => {
                const isSelected = selectedIdxes.includes(i);
                return (
                  <button
                    key={g.id}
                    onClick={() => handleGalleryTap(i)}
                    className={`relative h-[60px] flex-[0_0_80px] overflow-hidden rounded-[10px] border-2 transition-all ${
                      isSelected
                        ? "border-teal-deep shadow-sm"
                        : "border-transparent opacity-60"
                    }`}
                  >
                    <Photo
                      className="h-full w-full"
                      src={mobixImage(g.url)}
                      alt=""
                    />
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
              (klik foto-foto untuk share foto lebih dari 1)
            </div>
          </div>
        )}

        {/* caption – editable */}
        <div className="mb-[18px] rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted">
              Caption (bisa diedit)
            </span>
            <div className="flex items-center gap-2.5">
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
              className="w-full resize-none bg-transparent text-[12px] leading-[1.55] text-mid outline-none"
            />
          )}
        </div>

        {/* editable price */}
        <div className="mb-3 rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div className="mb-1.5 text-[11px] font-bold text-muted">
            Harga jual kamu (ubah sesuai deal)
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[13px] font-semibold text-muted">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={priceInput}
              onChange={handlePriceChange}
              disabled={!unit}
              className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-ink outline-none disabled:opacity-40"
              placeholder="0"
            />
            {unit && dealHarga !== unit.harga && (
              <button
                onClick={() => {
                  setDealHarga(unit.harga);
                  setPriceInput(
                    new Intl.NumberFormat("id-ID").format(unit.harga),
                  );
                }}
                className="shrink-0 text-[11px] font-semibold text-muted underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* est. komisi */}
        <div className="mb-[18px] flex items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div>
            <div className="text-[13px] font-semibold text-mid">Est. komisi kamu</div>
            {unit && dealHarga !== unit.harga && (
              <div className="mt-0.5 text-[10px] text-muted">
                {dealHarga < unit.harga
                  ? "Harga di bawah asli"
                  : `Selisih +${formatRupiah(dealHarga - unit.harga)}`}
              </div>
            )}
          </div>
          {loading || !unit ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <span
              className={`text-[15px] font-bold ${
                komisi >= 2_000_000 ? "text-teal-deep" : "text-ink"
              }`}
            >
              {formatRupiah(komisi)}
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
            className="flex w-full items-center justify-center gap-2.5 rounded-[18px] bg-teal-deep py-4 text-[15px] font-bold text-surface disabled:opacity-50"
          >
            {(composing || shareComposing) ? (
              <span className="text-[13px] opacity-80">Menyiapkan gambar…</span>
            ) : (
              <>
                <ShareArrow size={18} />
                Bagikan Sekarang
                {selectedIdxes.length > 1 && (
                  <span className="text-[12px] opacity-80">
                    ({selectedIdxes.length} foto)
                  </span>
                )}
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
              Download gambar siap-posting
            </span>
            <span className="text-[12px] font-bold text-teal-deep">
              {composedFiles.length > 1 ? `${composedFiles.length} JPG` : "JPG"}
            </span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
