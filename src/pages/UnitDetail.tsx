import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Photo, Skeleton } from "../components/ui";
import { UnitRow } from "../components/UnitRow";
import { ChevronLeft, ShareArrow, Chat, Check, Close } from "../components/icons";
import {
  fetchUnitDetail,
  mobixImage,
  titleCase,
  toCardUnit,
  deriveBadge,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatRupiah, formatOdometer } from "../lib/format";
import {
  TENOR_OPTIONS,
  downPayment,
  monthlyInstallment,
  type Tenor,
} from "../lib/installment";
import { simulateKredit, type DsfSimResult } from "../lib/dsf";

export function UnitDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: unit, loading, error } = useAsync(
    () => fetchUnitDetail(slug),
    [slug],
  );

  const [dpPercent, setDpPercent] = useState(15);
  const [tenor, setTenor] = useState<Tenor>(60);
  const [activeThumb, setActiveThumb] = useState(0);
  const [showAllThumbs, setShowAllThumbs] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [simResult, setSimResult] = useState<DsfSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const simTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const price = unit?.harga ?? 0;
  const localDp = downPayment(price, dpPercent);
  const localMonthly = monthlyInstallment(price, dpPercent, tenor);

  const displayDp = simResult?.downPaymentRounded ?? localDp;
  const displayMonthly = simResult?.installmentRounded ?? localMonthly;
  const displayTdp = simResult?.totalDownPaymentRounded ?? null;

  useEffect(() => {
    if (!price) return;
    clearTimeout(simTimer.current);
    setSimLoading(true);
    const nameParts = (unit?.nama ?? "").split(" ");
    simTimer.current = setTimeout(async () => {
      const result = await simulateKredit({
        unitPrice: price,
        dpPercent,
        tenor,
        brand: nameParts[0],
        model: nameParts[1],
        year: unit?.year,
      });
      setSimResult(result);
      setSimLoading(false);
    }, 600);
    return () => clearTimeout(simTimer.current);
  }, [price, dpPercent, tenor]);

  if (loading) {
    return (
      <AppShell bg="bg-surface">
        <AppBar title="Memuat unit…" />
        <div className="space-y-4 p-4">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !unit) {
    return (
      <AppShell bg="bg-surface">
        <AppBar title="Unit tidak ditemukan" back="/katalog" />
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
            <Close size={20} />
          </div>
          <div className="text-[14px] font-bold text-ink">
            Unit ini tidak tersedia
          </div>
          <div className="text-[13px] text-muted">
            {error ?? "Mungkin sudah terjual atau tautannya berubah."}
          </div>
          <Link
            href="/katalog"
            className="mt-2 rounded-[14px] bg-ink px-5 py-3 text-[14px] font-bold text-surface no-underline"
          >
            Lihat katalog
          </Link>
        </div>
      </AppShell>
    );
  }

  const gallery = unit.galeri ?? [];
  const heroSrc = mobixImage(gallery[activeThumb]?.url, 1600);
  const badge = deriveBadge({ odometer: unit.odometer, harga: price });
  const thumbCount = Math.min(4, gallery.length);

  const topSpecs = [
    { label: "Transmisi", value: titleCase(unit.transmisi || "-") },
    { label: "Kilometer", value: formatOdometer(unit.odometer) },
    { label: "Kategori", value: titleCase(unit.category || "-") },
    { label: "Tahun", value: String(unit.year) },
    { label: "Warna", value: titleCase(unit.color || "-") },
    { label: "Plat", value: unit.plate_no || "-" },
  ];

  const docs = Object.entries(unit.kelengkapan_dokumen ?? {});
  const similar = (unit.harga_sejenis ?? []).slice(0, 5).map(toCardUnit);

  return (
    <AppShell bg="bg-surface">
      <main className="min-h-screen overflow-y-auto sm:min-h-0">
        {/* GALLERY */}
        <div className="relative">
          <Photo large className="aspect-[4/3]" src={heroSrc} alt={unit.nama} />
          {/* transparent tap zone behind all overlays */}
          <button
            className="absolute inset-0 cursor-zoom-in"
            aria-label="Lihat foto penuh"
            onClick={() => setLightbox(true)}
          />
          <Link
            href="/katalog"
            aria-label="Kembali"
            className="absolute left-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-ink no-underline backdrop-blur"
          >
            <ChevronLeft />
          </Link>
          <Link
            href={`/share?u=${unit.slug}`}
            aria-label="Share"
            className="absolute right-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-ink no-underline backdrop-blur"
          >
            <ShareArrow size={17} />
          </Link>
          <span className="absolute bottom-3.5 left-3.5 rounded-lg bg-teal px-2.5 py-1 text-[16px] font-bold text-ink">
            {badge ?? "Tersedia"} · {unit.plate_no}
          </span>
          {gallery.length > 0 && (
            <div className="absolute bottom-3.5 right-3.5 rounded-lg bg-ink/80 px-2.5 py-[3px] text-[11px] font-semibold text-surface">
              {activeThumb + 1} / {gallery.length}
            </div>
          )}
        </div>

        {/* LIGHTBOX */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            onClick={() => setLightbox(false)}
          >
            <button
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
              aria-label="Tutup"
              onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            >
              <Close size={16} />
            </button>
            <img
              src={heroSrc}
              alt={unit.nama}
              className="max-h-screen max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* THUMB STRIP */}
        {gallery.length > 1 && (
          <div className="scroll-x flex gap-2 overflow-x-auto px-4 py-3">
            {gallery.slice(0, showAllThumbs ? gallery.length : thumbCount).map((g, i) => (
              <button
                key={g.id}
                onClick={() => setActiveThumb(i)}
                className={`h-12 flex-[0_0_64px] overflow-hidden rounded-lg ${
                  i === activeThumb ? "ring-2 ring-ink" : ""
                }`}
              >
                <Photo className="h-full w-full" src={mobixImage(g.url, 800)} alt="" />
              </button>
            ))}
            {!showAllThumbs && gallery.length > thumbCount && (
              <button
                onClick={() => { setShowAllThumbs(true); setActiveThumb(thumbCount); }}
                className="flex h-12 flex-[0_0_64px] items-center justify-center rounded-lg bg-ink text-[12px] font-bold text-surface"
              >
                +{gallery.length - thumbCount}
              </button>
            )}
          </div>
        )}

        {/* TITLE BLOCK */}
        <div className="px-[18px] pt-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="rounded-md bg-field px-1.5 py-0.5 text-[11px] font-medium text-muted">
              🏢 Cabang: {titleCase(unit.lokasi || "Mobix")}
            </span>
            {unit.posisi && titleCase(unit.posisi) !== titleCase(unit.lokasi || "") && (
              <span className="rounded-md bg-field px-1.5 py-0.5 text-[11px] font-medium text-muted">
                📍 Posisi: {titleCase(unit.posisi)}
              </span>
            )}
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-widest text-[#3a3a3a]">
            {unit.plate_no}
          </div>
          <h1 className="m-0 mt-0.5 -tracking-[0.01em] text-[22px] font-extrabold leading-[1.2]">
            {unit.nama}
          </h1>
          <div className="mt-2.5 flex items-center justify-between">
            <div className="-tracking-[0.02em] text-[24px] font-extrabold">
              {price ? formatRupiah(price) : "Hubungi kami"}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted">Komisi</div>
              <div className="text-[12px] font-bold text-teal-deep">
                {(unit.aging ?? 0) > 60 ? "+Rp 2 juta" : "Mulai dari 2jt"}
              </div>
            </div>
          </div>
        </div>

        {/* SPEC GRID */}
        <div className="px-[18px] py-4">
          <div className="grid grid-cols-3 gap-2">
            {topSpecs.map((s) => (
              <div key={s.label} className="rounded-xl bg-field p-3 text-center">
                <div className="text-[11px] text-muted">{s.label}</div>
                <div className="mt-0.5 truncate text-[13px] font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CALCULATOR */}
        <div className="px-[18px] pb-4">
          <div className="rounded-[18px] border border-line bg-surface p-4">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="-tracking-[0.01em] text-[15px] font-extrabold">
                Simulasi Hitung Kredit
              </div>
              <span className="rounded-[7px] bg-teal-tint px-2 py-[3px] text-[11px] font-bold text-teal-deep">
                Bisa di-share
              </span>
            </div>

            <div className="mb-3.5">
              <div className="mb-2 flex justify-between text-[12px] font-semibold text-mid">
                <span>Uang muka · {dpPercent}%</span>
                <span className="font-extrabold text-ink">{formatRupiah(displayDp)}</span>
              </div>
              <input
                type="range"
                min={15}
                max={60}
                step={1}
                value={dpPercent}
                onChange={(e) => setDpPercent(Number(e.target.value))}
                aria-label="Persentase uang muka"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E0E7E9] accent-ink"
              />
            </div>

            <div className="mb-3.5">
              <div className="mb-2 text-[12px] font-semibold text-mid">Tenor (bulan)</div>
              <div className="grid grid-cols-5 gap-1.5">
                {TENOR_OPTIONS.map((t) => {
                  const isActive = t === tenor;
                  return (
                    <button
                      key={t}
                      onClick={() => setTenor(t)}
                      className={`rounded-[9px] py-[9px] text-center text-[12px] ${
                        isActive
                          ? "border-2 border-ink bg-ink font-bold text-surface"
                          : "border border-[#D4DEDF] font-semibold text-muted"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-[14px] bg-ink p-4 text-surface transition-opacity ${simLoading ? "opacity-60" : ""}`}>
              <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                HASIL SIMULASI
              </div>
              <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                    CICILAN PER BULAN
                  </div>
                  <div className="text-[13px] font-extrabold">
                    {formatRupiah(displayMonthly)}
                  </div>
                </div>
                {displayTdp !== null && (
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                      TOTAL BAYAR PERTAMA
                    </div>
                    <div className="text-[13px] font-extrabold">
                      {formatRupiah(displayTdp)}
                    </div>
                  </div>
                )}
                {simResult?.adminFee != null && (
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                      BIAYA ADMIN
                    </div>
                    <div className="text-[13px] font-extrabold">
                      {formatRupiah(simResult.adminFee)}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2.5 border-t border-white/10 pt-2 text-[11px] text-[#A4D7D7]">
                {tenor} bulan · asuransi TLO · sudah termasuk admin
              </div>
            </div>
            <p className="m-0 mt-2 text-[11px] text-muted">
              Simulasi, syarat &amp; ketentuan berlaku. Komisi bersifat estimasi.
            </p>
          </div>
        </div>

        {/* KELENGKAPAN DOKUMEN */}
        {docs.length > 0 && (
          <div className="px-[18px] pb-4">
            <div className="mb-2 -tracking-[0.01em] text-[15px] font-extrabold">
              Kelengkapan dokumen
            </div>
            <div className="flex flex-col gap-2">
              {docs.map(([k, v]) => {
                const isBpkb = k.toLowerCase() === "bpkb";
                const ada = isBpkb ? true : (/\b(ada|tersedia)\b/i.test(v) && !/^(tidak|belum)\b/i.test(v));
                return (
                  <div
                    key={k}
                    className="flex items-center gap-2.5 rounded-xl bg-field px-3.5 py-2.5"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        ada ? "bg-teal text-ink" : "bg-danger-bg text-danger"
                      }`}
                    >
                      {ada ? <Check size={11} /> : <Close size={10} />}
                    </span>
                    <span className="text-[13px] font-semibold uppercase text-ink">{k}</span>
                    <span className="ml-auto text-[12px] text-muted">
                      {isBpkb && /^(tidak|belum)\b/i.test(v) ? "Ada" : v}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DESKRIPSI */}
        {unit.deskripsi && (
          <div className="px-[18px] pb-4">
            <div className="mb-2 -tracking-[0.01em] text-[15px] font-extrabold">
              Deskripsi unit
            </div>
            <p className="m-0 whitespace-pre-line text-[13px] leading-[1.6] text-mid">
              {unit.deskripsi}
            </p>
          </div>
        )}

        {/* TANYA AI MOBIX */}
        <div className="px-[18px] pb-4">
          <a
            href={`https://wa.me/6285701959826?text=${encodeURIComponent(`Halo AI Mobix! Mau tanya soal unit *${unit.nama}* (plat ${unit.plate_no}) di cabang ${titleCase(unit.lokasi || "Mobix")}, harga ${formatRupiah(price)}. Bisa bantu info lebih lanjut? 🙏`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3.5 text-[14px] font-bold text-white no-underline shadow-[0_6px_24px_rgba(37,211,102,0.35)]"
          >
            <Chat size={18} className="text-white" />
            Tanya ke AI Mobix
          </a>
        </div>

        {/* UNIT SEJENIS */}
        {similar.length > 0 && (
          <div className="px-[18px] pb-4">
            <div className="mb-2 -tracking-[0.01em] text-[15px] font-extrabold">
              Rekomendasi lain
            </div>
            <div className="flex flex-col gap-2.5">
              {similar.map((u) => (
                <UnitRow key={u.id} unit={u} />
              ))}
            </div>
          </div>
        )}

        <div className="h-[96px]" />
      </main>

      {/* STICKY ACTIONS */}
      <div className="fixed bottom-9 left-1/2 z-30 flex w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 rounded-3xl border border-line bg-surface p-2.5 shadow-nav">
        <Link
          href={`/share?u=${unit.slug}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-3.5 py-3 text-[13px] font-bold text-surface no-underline"
        >
          Share ke klien
          <ShareArrow size={14} />
        </Link>
      </div>
    </AppShell>
  );
}
