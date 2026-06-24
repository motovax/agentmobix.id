import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { AppShell } from "../components/AppShell";
import { Photo, Skeleton } from "../components/ui";
import {
  Close,
  ShareArrow,
  Copy,
  Download,
} from "../components/icons";
import { fetchUnitDetail, mobixImage, mobixImageFetchable, titleCase } from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatJt, formatRupiah } from "../lib/format";

export function ShareSheet() {
  const search = useSearch();
  const slug = new URLSearchParams(search).get("u") ?? "";
  const { data: unit, loading } = useAsync(() => fetchUnitDetail(slug), [slug]);

  const [copied, setCopied] = useState<"" | "caption" | "link">("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Pre-fetch image blob so navigator.share({ files }) can be called synchronously
  // from user gesture (browsers block share with files if called after await).
  // Uses the CORS-enabled API proxy (not the CDN origin which has no CORS headers).
  useEffect(() => {
    if (!unit) return;
    const src = mobixImageFetchable(unit.galeri?.[0]?.url);
    if (!src) return;
    fetch(src)
      .then((r) => r.ok ? r.blob() : Promise.reject())
      .then((blob) => setImageFile(new File([blob], "unit.jpg", { type: blob.type || "image/jpeg" })))
      .catch(() => { /* proxy unavailable — share without image */ });
  }, [unit]);

  const link = unit ? `mobix.id/u/${unit.plate_no}` : "mobix.id";
  const caption = unit
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
      /* clipboard unavailable — no-op */
    }
  }

  function handleShare() {
    const text = `${caption}\nhttps://${link}`;
    const pageUrl = `https://${link}`;
    const canShareFiles = !!imageFile && !!navigator.canShare?.({ files: [imageFile] });
    const shareData: ShareData = canShareFiles
      ? { files: [imageFile!], text, url: pageUrl }
      : { text, url: pageUrl };

    if (navigator.share) {
      void navigator.share(shareData);
      return;
    }
    // Desktop fallback: open WA with caption
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const backHref = unit ? `/unit/${unit.slug}` : "/katalog";

  return (
    <AppShell bg="bg-ink">
      {/* backdrop hint */}
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
          <Photo
            large
            className="aspect-video"
            src={mobixImage(unit?.galeri?.[0]?.url)}
            alt={unit?.nama}
          >
            {unit && (
              <div className="absolute bottom-3 left-3 rounded-lg bg-ink/85 px-2.5 py-[5px] text-[12px] font-bold text-surface">
                Rp {formatJt(unit.harga)} · TDP {formatJt(unit.tdp)}
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

        {/* caption preview */}
        <div className="mb-[18px] rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted">
              Caption otomatis dari AI Mobix
            </span>
            <button
              onClick={() => copy("caption", caption)}
              disabled={!unit}
              className="text-[11px] font-bold text-teal-deep disabled:opacity-40"
            >
              {copied === "caption" ? "Tersalin ✓" : "Salin"}
            </button>
          </div>
          {loading || !unit ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : (
            <p className="m-0 text-[12px] leading-[1.55] text-mid">{caption}</p>
          )}
        </div>

        {/* share button */}
        <button
          onClick={handleShare}
          disabled={!unit}
          className="mb-[18px] flex w-full items-center justify-center gap-2.5 rounded-[18px] bg-teal-deep py-4 text-[15px] font-bold text-surface disabled:opacity-50"
        >
          <ShareArrow size={18} />
          Bagikan Sekarang
        </button>

        {/* secondary actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => copy("link", `https://${link}`)}
            disabled={!unit}
            className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5 text-ink disabled:opacity-50"
          >
            <Copy className="text-ink" />
            <span className="flex-1 text-left text-[14px] font-semibold">
              Salin link unit
            </span>
            <span className="text-[12px] text-muted">
              {copied === "link" ? "Tersalin ✓" : link}
            </span>
          </button>
          <button
            disabled={!unit}
            className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5 text-ink disabled:opacity-50"
          >
            <Download className="text-ink" />
            <span className="flex-1 text-left text-[14px] font-semibold">
              Download gambar siap-posting
            </span>
            <span className="text-[12px] font-bold text-teal-deep">JPG</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
