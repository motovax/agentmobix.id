import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Photo, Skeleton } from "../components/ui";
import { UnitRow } from "../components/UnitRow";
import { ChevronLeft, ShareArrow, Chat, Check, Close } from "../components/icons";
import {
  fetchUnitDetail,
  mobixImage,
  estimateKomisi,
  titleCase,
  toCardUnit,
  deriveBadge,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatRupiah, formatRpJt, formatOdometer } from "../lib/format";
import {
  TENOR_OPTIONS,
  downPayment,
  monthlyInstallment,
  type Tenor,
} from "../lib/installment";

export function UnitDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: unit, loading, error } = useAsync(
    () => fetchUnitDetail(slug),
    [slug],
  );

  const [dpPercent, setDpPercent] = useState(20);
  const [tenor, setTenor] = useState<Tenor>(60);
  const [activeThumb, setActiveThumb] = useState(0);
  const [showAllThumbs, setShowAllThumbs] = useState(false);

  const price = unit?.harga ?? 0;
  const dp = downPayment(price, dpPercent);
  const monthly = useMemo(
    () => monthlyInstallment(price, dpPercent, tenor),
    [price, dpPercent, tenor],
  );

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
  const heroSrc = mobixImage(gallery[activeThumb]?.url, 800);
  const komisi = estimateKomisi(price);
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
              <div className="text-[10px] text-muted">Komisi kamu</div>
              <div className="text-[16px] font-extrabold text-teal-deep">
                {formatRpJt(komisi)}
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
                Hitung paket cicilan
              </div>
              <span className="rounded-[7px] bg-teal-tint px-2 py-[3px] text-[11px] font-bold text-teal-deep">
                Bisa di-share
              </span>
            </div>

            <div className="mb-3.5">
              <div className="mb-2 flex justify-between text-[12px] font-semibold text-mid">
                <span>Uang muka · {dpPercent}%</span>
                <span className="font-extrabold text-ink">{formatRupiah(dp)}</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
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

            <div className="rounded-[14px] bg-ink p-4 text-surface">
              <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                CICILAN PER BULAN
              </div>
              <div className="mt-0.5 -tracking-[0.02em] text-[26px] font-extrabold">
                {formatRupiah(monthly)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#A4D7D7]">
                {tenor} bulan · asuransi all-risk · sudah termasuk admin
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
                const ada = /ada/i.test(v) && !/tidak/i.test(v);
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
                    <span className="ml-auto text-[12px] text-muted">{v}</span>
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

        {/* PIC */}
        <div className="px-[18px] pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-field p-3.5">
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-deep text-[13px] font-extrabold text-ink">
              {(titleCase(unit.lokasi || "MB").slice(0, 2)).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold">
                Tim Cabang {titleCase(unit.lokasi || "Mobix")}
              </div>
              <div className="text-[11px] text-muted">
                Pegang unit ini · biasanya balas cepat
              </div>
            </div>
            <Link
              href="/ai"
              aria-label="Chat PIC"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-surface no-underline"
            >
              <Chat />
            </Link>
          </div>
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
      <div className="sticky bottom-0 left-0 right-0 z-30 flex gap-2.5 border-t border-[#EEF2F3] bg-white/95 px-4 py-3 backdrop-blur-md">
        <Link
          href="/ai"
          className="flex flex-[0_0_auto] items-center gap-1.5 rounded-[14px] border border-[#D4DEDF] bg-surface px-4 py-3.5 text-[14px] font-bold text-ink no-underline"
        >
          <Chat size={16} />
          Minta foto
        </Link>
        <Link
          href={`/share?u=${unit.slug}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-ink px-3.5 py-3.5 text-[15px] font-bold text-surface no-underline"
        >
          Share ke klien
          <ShareArrow size={14} />
        </Link>
      </div>
    </AppShell>
  );
}
