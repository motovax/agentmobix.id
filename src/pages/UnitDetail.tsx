import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { AppShell } from "../components/AppShell";
import { Photo } from "../components/ui";
import { ChevronLeft, ShareArrow, Chat } from "../components/icons";
import { findUnit, CATALOG } from "../data/catalog";
import { formatRupiah, formatRpJt, formatOdometer } from "../lib/format";
import {
  TENOR_OPTIONS,
  downPayment,
  monthlyInstallment,
  type Tenor,
} from "../lib/installment";

export function UnitDetail() {
  const { slug } = useParams<{ slug: string }>();
  const unit = findUnit(slug) ?? CATALOG[0];

  const [dpPercent, setDpPercent] = useState(20);
  const [tenor, setTenor] = useState<Tenor>(60);
  const [activeThumb, setActiveThumb] = useState(0);

  const dp = downPayment(unit.price, dpPercent);
  const monthly = useMemo(
    () => monthlyInstallment(unit.price, dpPercent, tenor),
    [unit.price, dpPercent, tenor],
  );

  const specs = [
    { label: "Transmisi", value: unit.transmission },
    { label: "Kilometer", value: formatOdometer(unit.km) },
    { label: "Bahan bakar", value: unit.fuel },
    { label: "Tahun", value: String(unit.year) },
    { label: "Pajak", value: unit.tax },
    { label: "Plat", value: unit.plate },
  ];

  const thumbCount = Math.min(4, unit.photos);

  return (
    <AppShell bg="bg-surface">
      <main className="min-h-screen overflow-y-auto pb-0 sm:min-h-0">
        {/* GALLERY */}
        <div className="relative">
          <Photo large className="aspect-[4/3]" />
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
          <span className="absolute bottom-3.5 left-3.5 rounded-lg bg-teal px-2.5 py-1 text-[11px] font-bold text-ink">
            {unit.badge ?? "Tersedia"} · ID {unit.code}
          </span>
          <div className="absolute bottom-3.5 right-3.5 rounded-lg bg-ink/80 px-2.5 py-[3px] text-[11px] font-semibold text-surface">
            {activeThumb + 1} / {unit.photos}
          </div>
        </div>

        {/* THUMB STRIP */}
        <div className="scroll-x flex gap-2 overflow-x-auto px-4 py-3">
          {Array.from({ length: thumbCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveThumb(i)}
              className={`h-12 flex-[0_0_64px] rounded-lg bg-hatch ${
                i === activeThumb ? "border-2 border-ink" : ""
              }`}
            />
          ))}
          {unit.photos > thumbCount && (
            <div className="flex h-12 flex-[0_0_64px] items-center justify-center rounded-lg bg-ink text-[12px] font-bold text-surface">
              +{unit.photos - thumbCount}
            </div>
          )}
        </div>

        {/* TITLE BLOCK */}
        <div className="px-[18px] pt-1">
          <div className="text-[12px] text-muted">
            Siap di cabang {unit.branch} · {unit.branchArea}
          </div>
          <h1 className="m-0 mt-1 -tracking-[0.01em] text-[22px] font-extrabold leading-[1.2]">
            {unit.title}
          </h1>
          <div className="mt-2.5 flex items-center justify-between">
            <div className="-tracking-[0.02em] text-[24px] font-extrabold">
              {formatRupiah(unit.price)}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted">Komisi kamu</div>
              <div className="text-[16px] font-extrabold text-teal-deep">
                {formatRpJt(unit.komisi)}
              </div>
            </div>
          </div>
        </div>

        {/* SPEC GRID */}
        <div className="px-[18px] py-4">
          <div className="grid grid-cols-3 gap-2">
            {specs.map((s) => (
              <div key={s.label} className="rounded-xl bg-field p-3 text-center">
                <div className="text-[11px] text-muted">{s.label}</div>
                <div className="mt-0.5 text-[13px] font-bold">{s.value}</div>
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

            {/* DP */}
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

            {/* TENOR */}
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

            {/* RESULT */}
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
              Simulasi, syarat &amp; ketentuan berlaku.
            </p>
          </div>
        </div>

        {/* DESKRIPSI */}
        <div className="px-[18px] pb-4">
          <div className="mb-2 -tracking-[0.01em] text-[15px] font-extrabold">
            Deskripsi unit
          </div>
          <p className="m-0 text-[13px] leading-[1.6] text-mid">{unit.description}</p>
        </div>

        {/* PIC */}
        <div className="px-[18px] pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-field p-3.5">
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-deep text-[13px] font-extrabold text-ink">
              {unit.pic.initials}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold">
                {unit.pic.name} · {unit.pic.branchLabel}
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
