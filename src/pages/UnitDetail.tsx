import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css/core";
import { Link, useParams } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Photo, Skeleton } from "../components/ui";
import { UnitRow } from "../components/UnitRow";
import { ChevronLeft, ShareArrow, Chat, Check, Close } from "../components/icons";
import {
  fetchUnitDetail,
  mobixImage,
  MOBIX_HERO_WIDTH,
  MOBIX_THUMBNAIL_WIDTH,
  titleCase,
  toCardUnit,
  deriveBadge,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatRupiah, formatOdometer } from "../lib/format";
import {
  TENOR_OPTIONS,
  downPayment,
  type Tenor,
} from "../lib/installment";
import {
  resolveMobixCreditSimulation,
  type DsfSimResult,
} from "../lib/dsf";

const UNMASKED_BPKB_WORDS = new Set(["ada", "tidak", "belum", "iya", "ya"]);

function maskPersonName(value: string) {
  const words = value.trim().split(/\s+/);

  return words
    .map((word) => {
      const m = word.match(
        /^([^A-Za-zÀ-ÖØ-öø-ÿ']*)([A-Za-zÀ-ÖØ-öø-ÿ']+)([^A-Za-zÀ-ÖØ-öø-ÿ']*)$/u,
      );
      if (!m) return word;
      const prefix = m[1];
      const core = m[2];
      const suffix = m[3];
      if (UNMASKED_BPKB_WORDS.has(core.toLowerCase()))
        return `${prefix}${core}${suffix}`;

      if (core.length <= 2) return `${prefix}${core}${suffix}`;
      return `${prefix}${core[0]}${"*".repeat(core.length - 2)}${core[core.length - 1]}${suffix}`;
    })
    .join(" ");
}

function resolveBpkbOwnership(value: string) {
  const lower = value.toLowerCase();
  const isCompany =
    /\b(pt|cv|coop|koperasi|persero|perseroan|limited|ltd|gmo|group|badan hukum|pt\.)\b/.test(
      lower,
    ) || /\bunlimited\b/.test(lower);

  if (isCompany) return "BPKB Perusahaan";

  const isPersonal =
    /\b(perorangan|pribadi|individu|nama pemilik|atas nama)\b/.test(
      lower,
    );
  if (isPersonal) return "BPKB Perorangan";

  return null;
}

function maskBpkbValue(value: string) {
  if (!value || /^(tidak|belum)\b/i.test(value.trim())) return value;

  const ownership = resolveBpkbOwnership(value);
  if (ownership) return ownership;

  return maskPersonName(value);
}

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
  const [dpAmountInput, setDpAmountInput] = useState("");
  const [simResult, setSimResult] = useState<DsfSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(false);
  const [simRefreshKey, setSimRefreshKey] = useState(0);
  const simTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pageRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<Splide>(null);

  const price = unit?.harga ?? 0;
  const baseCreditPrice = unit?.harga_kredit || price;

  const dsfCreditPrice = simResult?.hargaKredit;
  const dsfDp = simResult?.downPaymentRounded;
  const dsfDpPercent = simResult?.percentDownPayment;
  const dsfMonthly = simResult?.installmentRounded;
  const dsfTdp = simResult?.totalDownPaymentRounded;
  const displayCreditPrice =
    typeof dsfCreditPrice === "number" && Number.isFinite(dsfCreditPrice) && dsfCreditPrice > 0
      ? dsfCreditPrice
      : null;
  const displayDp =
    typeof dsfDp === "number" && Number.isFinite(dsfDp) && dsfDp > 0
      ? dsfDp
      : null;
  const displayDpPercent =
    typeof dsfDpPercent === "number" && Number.isFinite(dsfDpPercent) && dsfDpPercent > 0
      ? dsfDpPercent
      : dpPercent;
  const displayMonthly =
    typeof dsfMonthly === "number" && Number.isFinite(dsfMonthly) && dsfMonthly > 0
      ? dsfMonthly
      : null;
  const displayTdp =
    typeof dsfTdp === "number" && Number.isFinite(dsfTdp) && dsfTdp > 0
      ? dsfTdp
      : null;
  const simPending = price > 0 && simResult === null && !simError;
  const canShareSimulation =
    displayCreditPrice !== null &&
    displayDp !== null &&
    displayMonthly !== null &&
    displayTdp !== null;
  const currencyFormatter = new Intl.NumberFormat("id-ID");
  const shareHref = canShareSimulation
    ? `/share?${new URLSearchParams({
        u: unit?.slug ?? slug ?? "",
        tenor: String(tenor),
        dp_pct: String(Math.round(displayDpPercent * 10) / 10),
        dp: String(Math.round(displayDp)),
        harga_kredit: String(Math.round(displayCreditPrice)),
        cicilan: String(Math.round(displayMonthly)),
        tdp: String(Math.round(displayTdp)),
      }).toString()}`
    : null;

  function formatDpValue(value: number) {
    return currencyFormatter.format(Math.max(0, Math.round(value || 0)));
  }

  function toDpPercentFromAmount(amount: number) {
    if (!displayCreditPrice) return 15;
    const next = Math.round((amount / displayCreditPrice) * 100);
    if (Number.isNaN(next)) return 15;
    return Math.min(60, Math.max(15, next));
  }

  useEffect(() => {
    if (!displayCreditPrice || !displayDp) {
      setDpAmountInput("");
      return;
    }
    setDpAmountInput(formatDpValue(displayDp));
  }, [displayCreditPrice, displayDp]);

  function handleDpAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDpAmountInput("");
      return;
    }
    setDpAmountInput(formatDpValue(Number(raw)));
  }

  function handleDpAmountBlur() {
    if (!price || !displayCreditPrice) return;
    if (!dpAmountInput) {
      setDpAmountInput(displayDp ? formatDpValue(displayDp) : "");
      return;
    }
    const amount = Number(dpAmountInput.replace(/\D/g, ""));
    const nextPercent = toDpPercentFromAmount(amount);
    setDpPercent(nextPercent);
    setDpAmountInput(formatDpValue(downPayment(displayCreditPrice, nextPercent)));
  }

  function refreshDsfSimulation() {
    setSimRefreshKey((value) => value + 1);
  }

  useEffect(() => {
    if (!price) {
      setSimResult(null);
      setSimLoading(false);
      setSimError(false);
      return;
    }
    let alive = true;
    const controller = new AbortController();
    clearTimeout(simTimer.current);
    setSimResult(null);
    setSimError(false);
    setSimLoading(true);
    simTimer.current = setTimeout(async () => {
      const result = await resolveMobixCreditSimulation(
        {
          unitPrice: baseCreditPrice,
          dpPercent,
          tenor,
          brand: unit?.brand,
          model: unit?.type,
          year: unit?.year,
        },
        price,
        baseCreditPrice,
        controller.signal,
      );
      if (!alive) return;
      setSimResult(result);
      setSimError(result === null);
      setSimLoading(false);
    }, 600);
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(simTimer.current);
    };
  }, [
    price,
    baseCreditPrice,
    dpPercent,
    tenor,
    unit?.brand,
    unit?.type,
    unit?.year,
    simRefreshKey,
  ]);

  useEffect(() => {
    setActiveThumb(0);
    setShowAllThumbs(false);
    setLightbox(false);
    pageRef.current?.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    if (loading || !unit || window.location.hash !== "#simulasi-kredit") return;
    const timer = window.setTimeout(() => {
      document.getElementById("simulasi-kredit")?.scrollIntoView({ block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loading, unit?.slug]);

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
  const heroUrl = gallery[activeThumb]?.url;
  const heroSrc = mobixImage(heroUrl, MOBIX_HERO_WIDTH);
  const badge = deriveBadge({ odometer: unit.odometer, harga: price });
  const thumbCount = Math.min(4, gallery.length);

  function selectPhoto(index: number) {
    setActiveThumb(index);
    galleryRef.current?.go(index);
  }

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
      <main ref={pageRef} className="min-h-screen overflow-y-auto sm:min-h-0">
        {/* GALLERY */}
        <div className="relative overflow-hidden">
          {gallery.length > 0 ? (
            <Splide
              key={unit.slug}
              ref={galleryRef}
              className="unit-gallery-splide aspect-[4/3] cursor-zoom-in bg-hatch-lg"
              options={{
                arrows: false,
                drag: gallery.length > 1,
                gap: 0,
                pagination: false,
                perMove: 1,
                perPage: 1,
                rewind: gallery.length > 1,
                slideFocus: false,
                speed: 260,
                waitForTransition: false,
              }}
              onMoved={(_splide, index) => setActiveThumb(index)}
              onClick={(_splide, _slide, event) => {
                event.preventDefault();
                setLightbox(true);
              }}
              aria-label={`Galeri foto ${unit.nama}`}
            >
              {gallery.map((g, index) => (
                <SplideSlide key={g.id}>
                  <Photo
                    large
                    className="h-full w-full"
                    src={mobixImage(g.url, MOBIX_HERO_WIDTH)}
                    placeholderSrc={mobixImage(g.url, MOBIX_THUMBNAIL_WIDTH)}
                    alt={index === activeThumb ? unit.nama : ""}
                  />
                </SplideSlide>
              ))}
            </Splide>
          ) : (
            <Photo large className="aspect-[4/3]" alt={unit.nama} />
          )}
          <Link
            href="/katalog"
            aria-label="Kembali"
            className="absolute left-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-ink no-underline backdrop-blur"
          >
            <ChevronLeft />
          </Link>
          {shareHref ? (
            <Link
              href={shareHref}
              aria-label="Share"
              className="absolute right-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-ink no-underline backdrop-blur"
            >
              <ShareArrow size={17} />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Share belum tersedia"
              disabled
              className="absolute right-3.5 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/70 text-ink/40 backdrop-blur"
            >
              <ShareArrow size={17} />
            </button>
          )}
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
          <>
            <div className="scroll-x flex gap-2 overflow-x-auto px-4 py-3">
              {gallery.slice(0, thumbCount).map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => selectPhoto(i)}
                  className={`h-12 flex-[0_0_64px] overflow-hidden rounded-lg ${
                    i === activeThumb ? "ring-2 ring-ink" : ""
                  }`}
                >
                  <Photo className="h-full w-full" src={mobixImage(g.url)} alt="" />
                </button>
              ))}
              {!showAllThumbs && gallery.length > thumbCount && (
                <button
                  onClick={() => setShowAllThumbs(true)}
                  className="flex h-12 flex-[0_0_64px] items-center justify-center rounded-lg bg-ink text-[12px] font-bold text-surface"
                >
                  +{gallery.length - thumbCount}
                </button>
              )}
            </div>

            {showAllThumbs && (
              <div className="grid grid-cols-4 gap-2 px-4 pb-3 pt-1">
                {gallery.slice(thumbCount).map((g, index) => {
                  const absoluteIndex = thumbCount + index;
                  return (
                    <button
                      key={g.id}
                      onClick={() => selectPhoto(absoluteIndex)}
                      className={`h-12 overflow-hidden rounded-lg ${
                        absoluteIndex === activeThumb ? "ring-2 ring-ink" : ""
                      }`}
                    >
                      <Photo className="h-full w-full" src={mobixImage(g.url)} alt="" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
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
            <div>
              <div className="-tracking-[0.02em] text-[24px] font-extrabold">
                {price ? formatRupiah(price) : "Hubungi kami"}
              </div>
              {simPending ? (
                <div className="mt-1 text-[12px] font-semibold text-muted">
                  Harga Kredit : Menghitung...
                </div>
              ) : simError ? (
                <div className="mt-1 text-[12px] font-semibold text-danger">
                  Harga Kredit : Maaf, ada kendala sistem
                </div>
              ) : displayCreditPrice ? (
                <div className="mt-1 text-[12px] font-semibold text-teal-deep">
                  Harga Kredit : {formatRupiah(displayCreditPrice)}
                </div>
              ) : null}
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
        <div id="simulasi-kredit" className="scroll-mt-4 px-[18px] pb-4">
          <div className="rounded-[18px] border border-line bg-surface p-4">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="-tracking-[0.01em] text-[15px] font-extrabold">
                Simulasi Hitung Kredit
              </div>
              <span className="rounded-[7px] bg-teal-tint px-2 py-[3px] text-[11px] font-bold text-teal-deep">
                {canShareSimulation ? "Bisa di-share" : "Menunggu DSF"}
              </span>
            </div>

            <div className="mb-3.5">
              <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-mid">
                <span>DP (Down Payment)</span>
                <span className="text-teal-deep">
                  {displayDp
                    ? `${Math.round(displayDpPercent * 10) / 10}% · ${formatRupiah(displayDp)}`
                    : simPending
                      ? "Menghitung..."
                      : "Maaf, ada kendala sistem"}
                </span>
              </div>
              <div className="mb-2 flex items-center rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="pr-2 text-[13px] font-semibold text-muted">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dpAmountInput}
                  onChange={handleDpAmountChange}
                  onBlur={handleDpAmountBlur}
                  disabled={!displayCreditPrice}
                  className="w-full bg-transparent text-[14px] font-bold text-ink outline-none disabled:opacity-60"
                  placeholder={simPending ? "Menghitung..." : ""}
                  aria-label="Total uang muka"
                />
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
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-muted">
                <span>15%</span>
                <span>60%</span>
              </div>
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
              {simPending ? (
                <div className="mt-2.5 border-t border-white/10 pt-2.5 text-[13px] font-semibold text-surface">
                  Menghitung harga kredit...
                </div>
              ) : simError ? (
                <div className="mt-2.5 border-t border-white/10 pt-2.5">
                  <div className="text-[13px] font-extrabold text-surface">
                    Maaf, ada kendala sistem
                  </div>
                  <div className="mt-1 text-[11px] leading-[1.5] text-[#A4D7D7]">
                    Harga kredit belum tersedia dari DSF. Coba refresh untuk mengambil ulang simulasi.
                  </div>
                  <button
                    type="button"
                    onClick={refreshDsfSimulation}
                    className="mt-3 rounded-[10px] bg-teal px-3.5 py-2 text-[12px] font-bold text-ink"
                  >
                    Refresh harga kredit
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                        CICILAN PER BULAN
                      </div>
                      <div className="text-[13px] font-extrabold">
                        {displayMonthly ? formatRupiah(displayMonthly) : "-"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-[0.04em] text-[#A4D7D7]">
                        TOTAL BAYAR PERTAMA
                      </div>
                      <div className="text-[13px] font-extrabold">
                        {displayTdp ? formatRupiah(displayTdp) : "-"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 border-t border-white/10 pt-2 text-[11px] text-[#A4D7D7]">
                    {tenor} bulan · asuransi TLO · sudah termasuk admin
                  </div>
                </>
              )}
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
                const displayValue = isBpkb ? maskBpkbValue(v) : v;
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
                      {isBpkb && /^(tidak|belum)\b/i.test(v) ? "Ada" : displayValue}
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
        {shareHref ? (
          <Link
            href={shareHref}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-3.5 py-3 text-[13px] font-bold text-surface no-underline"
          >
            Share ke klien
            <ShareArrow size={14} />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink/35 px-3.5 py-3 text-[13px] font-bold text-surface"
          >
            Share menunggu DSF
            <ShareArrow size={14} />
          </button>
        )}
      </div>
    </AppShell>
  );
}
