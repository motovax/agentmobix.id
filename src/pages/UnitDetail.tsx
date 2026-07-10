import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css/core";
import { Link, useParams } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Photo, Skeleton } from "../components/ui";
import { UnitRow } from "../components/UnitRow";
import { ChevronLeft, ShareArrow, Chat, Check, Close, Play } from "../components/icons";
import {
  fetchUnitDetail,
  mobixImage,
  mobixMedia,
  MOBIX_HERO_WIDTH,
  MOBIX_THUMBNAIL_WIDTH,
  titleCase,
  toCardUnit,
  deriveBadge,
  type GalleryItem,
  type VideoItem,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatRupiah, formatOdometer } from "../lib/format";
import {
  TENOR_OPTIONS,
  downPayment,
  monthlyInstallment,
  type Tenor,
} from "../lib/installment";
import {
  resolveSmartCreditPrice,
  simulateKreditWithSignal,
  type DsfSimMethod,
  type DsfSimResult,
} from "../lib/dsf";
import {
  clampBuilderPrice,
  estimateBuilderCommission,
  MAX_BUILDER_PRICE_DROP,
  minBuilderPrice,
} from "../lib/commission";

const UNMASKED_BPKB_WORDS = new Set(["ada", "tidak", "belum", "iya", "ya"]);
const MIN_DP_PERCENT = 15;
const MAX_DP_PERCENT = 60;
const TDP_RANGE_MAX_PERCENT = 80;
const MIN_INSTALLMENT_RATE = 0.005;
const MAX_INSTALLMENT_RATE = 0.05;
const INSTALLMENT_RANGE_DP_GUARD_PERCENT = MIN_DP_PERCENT;

type UnitMedia =
  | { kind: "image"; id: string; url: string; item: GalleryItem }
  | { kind: "video"; id: string; url: string; item: VideoItem };

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
  const [simulationMethod, setSimulationMethod] = useState<DsfSimMethod>("DP");
  const [tenor, setTenor] = useState<Tenor>(60);
  const [activeThumb, setActiveThumb] = useState(0);
  const [showAllThumbs, setShowAllThumbs] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [dpPercentInput, setDpPercentInput] = useState(String(MIN_DP_PERCENT));
  const [dpAmountInput, setDpAmountInput] = useState("");
  const [tdpAmount, setTdpAmount] = useState(0);
  const [tdpAmountInput, setTdpAmountInput] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [monthlyAmountInput, setMonthlyAmountInput] = useState("");
  const [builderPrice, setBuilderPrice] = useState(0);
  const [builderPriceInput, setBuilderPriceInput] = useState("");
  const [simResult, setSimResult] = useState<DsfSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(false);
  const [simRunKey, setSimRunKey] = useState(0);
  const [smartCreditPrice, setSmartCreditPrice] = useState<number | null>(null);
  const [smartCreditPriceLoading, setSmartCreditPriceLoading] = useState(false);
  const [smartCreditPriceError, setSmartCreditPriceError] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<Splide>(null);

  const originalPrice = unit?.harga ?? 0;
  const price = builderPrice > 0 ? builderPrice : originalPrice;
  const minimumBuilderPrice = minBuilderPrice(originalPrice);
  const estimatedCommission = estimateBuilderCommission(originalPrice, price);
  const priceDelta = price - originalPrice;
  const creditPriceForBounds = price;
  const minTdpAmount = Math.max(
    0,
    Math.round(unit?.tdp && unit.tdp > 0 ? unit.tdp : creditPriceForBounds * (MIN_DP_PERCENT / 100)),
  );
  const maxTdpAmount = Math.max(
    minTdpAmount,
    Math.round(creditPriceForBounds * (TDP_RANGE_MAX_PERCENT / 100)),
  );
  const minMonthlyAmount = Math.max(0, Math.round(creditPriceForBounds * MIN_INSTALLMENT_RATE));
  const estimatedSafeMaxMonthlyAmount =
    creditPriceForBounds > 0
      ? Math.floor(
          monthlyInstallment(
            creditPriceForBounds,
            INSTALLMENT_RANGE_DP_GUARD_PERCENT,
            tenor,
          ) / 10000,
        ) * 10000
      : 0;
  const maxMonthlyAmount = Math.max(
    minMonthlyAmount,
    estimatedSafeMaxMonthlyAmount || Math.round(creditPriceForBounds * MAX_INSTALLMENT_RATE),
  );

  const dsfDpPercent = simResult?.percentDownPayment;
  const dsfMonthly = simResult?.installmentRounded;
  const dsfTdp = simResult?.totalDownPaymentRounded;
  const displayDpPercent =
    simulationMethod === "DP" ||
    typeof dsfDpPercent !== "number" ||
    !Number.isFinite(dsfDpPercent) ||
    dsfDpPercent <= 0
      ? dpPercent
      : dsfDpPercent;
  const displayDp = price > 0 ? downPayment(price, displayDpPercent) : null;
  const displayMonthly =
    typeof dsfMonthly === "number" && Number.isFinite(dsfMonthly) && dsfMonthly > 0
      ? dsfMonthly
      : null;
  const displayTdp =
    typeof dsfTdp === "number" && Number.isFinite(dsfTdp) && dsfTdp > 0
      ? dsfTdp
      : null;
  const defaultTdpAmount =
    displayTdp ?? (unit?.tdp && unit.tdp > 0 ? unit.tdp : minTdpAmount);
  const defaultMonthlyAmount =
    displayMonthly ??
    (unit?.cicilan && unit.cicilan > 0
      ? Math.round(unit.cicilan)
      : minMonthlyAmount);
  const tdpSimulationAmount = tdpAmount > 0 ? tdpAmount : defaultTdpAmount;
  const monthlySimulationAmount =
    monthlyAmount > 0 ? monthlyAmount : defaultMonthlyAmount;
  const simPending = price > 0 && simResult === null && !simError;
  const creditPriceForDisplay =
    typeof smartCreditPrice === "number" &&
    Number.isFinite(smartCreditPrice) &&
    smartCreditPrice > 0
      ? smartCreditPrice
      : null;
  const hasCreditPriceIssue =
    price > 0 && !smartCreditPriceLoading && creditPriceForDisplay === null;
  const displayAdminFee =
    typeof simResult?.adminFee === "number" &&
    Number.isFinite(simResult.adminFee) &&
    simResult.adminFee > 0
      ? simResult.adminFee
      : 5500000;
  const canShareSimulation =
    displayDp !== null &&
    displayMonthly !== null &&
    displayTdp !== null &&
    creditPriceForDisplay !== null;
  const currencyFormatter = new Intl.NumberFormat("id-ID");
  const shareHref = canShareSimulation
    ? `/share?${new URLSearchParams({
        u: unit?.slug ?? slug ?? "",
        harga: String(Math.round(price)),
        komisi: String(Math.round(estimatedCommission)),
        tenor: String(tenor),
        dp_pct: String(Math.round(displayDpPercent * 10) / 10),
        dp: String(Math.round(displayDp)),
        ...(creditPriceForDisplay
          ? { harga_kredit: String(Math.round(creditPriceForDisplay)) }
          : {}),
        cicilan: String(Math.round(displayMonthly)),
        tdp: String(Math.round(displayTdp)),
      }).toString()}`
    : null;

  function formatDpValue(value: number) {
    return currencyFormatter.format(Math.max(0, Math.round(value || 0)));
  }

  function clampValue(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function parseCurrencyInput(value: string) {
    return Number(value.replace(/\D/g, ""));
  }

  function commitBuilderPrice(value: number) {
    if (!originalPrice) return;
    const nextPrice = clampBuilderPrice(value || originalPrice, originalPrice);
    setBuilderPrice(nextPrice);
    setBuilderPriceInput(formatDpValue(nextPrice));
    setTdpAmount(0);
    setTdpAmountInput("");
    setMonthlyAmount(0);
    setMonthlyAmountInput("");
    setSimResult(null);
    setSimError(false);
    setSmartCreditPrice(null);
    setSmartCreditPriceError(false);
    setSimRunKey((current) => current + 1);
  }

  function handleBuilderPriceChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setBuilderPriceInput("");
      return;
    }
    setBuilderPriceInput(formatDpValue(Number(raw)));
  }

  function handleBuilderPriceBlur() {
    commitBuilderPrice(parseCurrencyInput(builderPriceInput));
  }

  function handleBuilderPriceKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  function toDpPercentFromAmount(amount: number) {
    if (!price) return MIN_DP_PERCENT;
    const next = Math.round((amount / price) * 100);
    if (Number.isNaN(next)) return MIN_DP_PERCENT;
    return clampValue(next, MIN_DP_PERCENT, MAX_DP_PERCENT);
  }

  useEffect(() => {
    if (!unit) return;
    setBuilderPrice(unit.harga);
    setBuilderPriceInput(formatDpValue(unit.harga));
  }, [unit?.id, unit?.harga]);

  useEffect(() => {
    setDpPercentInput(String(Math.round(displayDpPercent * 10) / 10));
  }, [displayDpPercent]);

  useEffect(() => {
    if (!price || !displayDp) {
      setDpAmountInput("");
      return;
    }
    setDpAmountInput(formatDpValue(displayDp));
  }, [price, displayDp]);

  useEffect(() => {
    if (!tdpAmount) {
      setTdpAmountInput("");
      return;
    }
    setTdpAmountInput(formatDpValue(tdpAmount));
  }, [tdpAmount]);

  useEffect(() => {
    if (!monthlyAmount) {
      setMonthlyAmountInput("");
      return;
    }
    setMonthlyAmountInput(formatDpValue(monthlyAmount));
  }, [monthlyAmount]);

  useEffect(() => {
    if (simulationMethod === "TDP" && !tdpAmount && displayTdp) {
      setTdpAmount(clampValue(displayTdp, minTdpAmount, maxTdpAmount));
    }

    if (simulationMethod === "Installment" && !monthlyAmount && displayMonthly) {
      setMonthlyAmount(
        clampValue(displayMonthly, minMonthlyAmount, maxMonthlyAmount),
      );
    }
  }, [
    simulationMethod,
    tdpAmount,
    monthlyAmount,
    displayTdp,
    displayMonthly,
    minTdpAmount,
    maxTdpAmount,
    minMonthlyAmount,
    maxMonthlyAmount,
  ]);

  useEffect(() => {
    if (simulationMethod !== "Installment" || !price) return;

    const nextAmount = clampValue(
      monthlyAmount || displayMonthly || defaultMonthlyAmount,
      minMonthlyAmount,
      maxMonthlyAmount,
    );

    if (nextAmount !== monthlyAmount) {
      setMonthlyAmount(nextAmount);
    }
  }, [
    simulationMethod,
    price,
    monthlyAmount,
    displayMonthly,
    defaultMonthlyAmount,
    minMonthlyAmount,
    maxMonthlyAmount,
  ]);

  function handleDpPercentChange(e: ChangeEvent<HTMLInputElement>) {
    setDpPercentInput(e.target.value.replace(/[^\d.]/g, ""));
  }

  function handleDpPercentBlur() {
    const parsed = Number(dpPercentInput);
    const nextPercent = Number.isFinite(parsed)
      ? clampValue(parsed, MIN_DP_PERCENT, MAX_DP_PERCENT)
      : MIN_DP_PERCENT;
    setDpPercent(nextPercent);
    setDpPercentInput(String(Math.round(nextPercent * 10) / 10));
  }

  function handleDpAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDpAmountInput("");
      return;
    }
    setDpAmountInput(formatDpValue(Number(raw)));
  }

  function handleDpAmountBlur() {
    if (!price) return;
    if (!dpAmountInput) {
      setDpAmountInput(displayDp ? formatDpValue(displayDp) : "");
      return;
    }
    const amount = Number(dpAmountInput.replace(/\D/g, ""));
    const nextPercent = toDpPercentFromAmount(amount);
    setDpPercent(nextPercent);
    setDpAmountInput(formatDpValue(downPayment(price, nextPercent)));
  }

  function handleSimulationMethodChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextMethod = e.target.value as DsfSimMethod;
    setSimulationMethod(nextMethod);

    if (nextMethod === "DP") {
      setDpPercent(clampValue(displayDpPercent, MIN_DP_PERCENT, MAX_DP_PERCENT));
      return;
    }

    if (nextMethod === "TDP") {
      setTdpAmount(
        clampValue(
          displayTdp ?? tdpSimulationAmount,
          minTdpAmount,
          maxTdpAmount,
        ),
      );
      return;
    }

    setMonthlyAmount(
      clampValue(
        displayMonthly ?? monthlySimulationAmount,
        minMonthlyAmount,
        maxMonthlyAmount,
      ),
    );
  }

  function handleTdpAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setTdpAmountInput("");
      return;
    }
    const nextAmount = clampValue(parseCurrencyInput(raw), minTdpAmount, maxTdpAmount);
    setTdpAmount(nextAmount);
    setTdpAmountInput(formatDpValue(nextAmount));
  }

  function handleTdpAmountBlur() {
    const nextAmount = clampValue(tdpAmount || tdpSimulationAmount, minTdpAmount, maxTdpAmount);
    setTdpAmount(nextAmount);
    setTdpAmountInput(formatDpValue(nextAmount));
  }

  function handleMonthlyAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setMonthlyAmountInput("");
      return;
    }
    const nextAmount = clampValue(parseCurrencyInput(raw), minMonthlyAmount, maxMonthlyAmount);
    setMonthlyAmount(nextAmount);
    setMonthlyAmountInput(formatDpValue(nextAmount));
  }

  function handleMonthlyAmountBlur() {
    const nextAmount = clampValue(
      monthlyAmount || monthlySimulationAmount,
      minMonthlyAmount,
      maxMonthlyAmount,
    );
    setMonthlyAmount(nextAmount);
    setMonthlyAmountInput(formatDpValue(nextAmount));
  }

  function runDsfSimulation() {
    setSimRunKey((value) => value + 1);
  }

  useEffect(() => {
    if (!price) {
      setSmartCreditPrice(null);
      setSmartCreditPriceLoading(false);
      setSmartCreditPriceError(false);
      return;
    }

    let alive = true;
    const controller = new AbortController();
    setSmartCreditPrice(null);
    setSmartCreditPriceError(false);
    setSmartCreditPriceLoading(true);

    (async () => {
      const result = await resolveSmartCreditPrice(
        {
          unitPrice: price,
          dpPercent: MIN_DP_PERCENT,
          simulationType: "DP",
          simulationValue: MIN_DP_PERCENT,
          tenor: 60,
          brand: unit?.brand,
          model: unit?.type,
          year: unit?.year,
        },
        price,
        controller.signal,
      );
      if (!alive) return;
      const nextPrice = result?.unitPrice && result.unitPrice > 0 ? result.unitPrice : null;
      setSmartCreditPrice(nextPrice);
      setSmartCreditPriceError(nextPrice === null);
      setSmartCreditPriceLoading(false);
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [price, unit?.brand, unit?.type, unit?.year]);

  useEffect(() => {
    if (!price) {
      setSimResult(null);
      setSimLoading(false);
      setSimError(false);
      return;
    }
    let alive = true;
    const controller = new AbortController();
    setSimResult(null);
    setSimError(false);
    setSimLoading(true);
    (async () => {
      const result = await simulateKreditWithSignal(
        {
          unitPrice: price,
          dpPercent,
          simulationType: simulationMethod,
          simulationValue:
            simulationMethod === "TDP"
              ? tdpSimulationAmount
              : simulationMethod === "Installment"
                ? monthlySimulationAmount
                : dpPercent,
          tenor,
          brand: unit?.brand,
          model: unit?.type,
          year: unit?.year,
        },
        controller.signal,
      );
      if (!alive) return;
      setSimResult(result);
      setSimError(result === null);
      setSimLoading(false);
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [
    price,
    unit?.brand,
    unit?.type,
    unit?.year,
    simRunKey,
  ]);

  useEffect(() => {
    setActiveThumb(0);
    setShowAllThumbs(false);
    setLightbox(false);
    setSimulationMethod("DP");
    setDpPercent(MIN_DP_PERCENT);
    setDpPercentInput(String(MIN_DP_PERCENT));
    setBuilderPrice(0);
    setBuilderPriceInput("");
    setTdpAmount(0);
    setTdpAmountInput("");
    setMonthlyAmount(0);
    setMonthlyAmountInput("");
    setSimResult(null);
    setSimError(false);
    setSmartCreditPrice(null);
    setSmartCreditPriceError(false);
    setSimRunKey((value) => value + 1);
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
  const videos = unit.video ?? [];
  const mediaItems: UnitMedia[] = [
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
  const activeMedia = mediaItems[activeThumb] ?? mediaItems[0];
  const heroSrc = activeMedia?.kind === "image"
    ? mobixImage(activeMedia.url, MOBIX_HERO_WIDTH)
    : mobixMedia(activeMedia?.url);
  const badge = deriveBadge({ odometer: unit.odometer, harga: price });
  const thumbCount = Math.min(4, mediaItems.length);

  function selectMedia(index: number) {
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
          {mediaItems.length > 0 ? (
            <Splide
              key={unit.slug}
              ref={galleryRef}
              className="unit-gallery-splide aspect-[4/3] cursor-zoom-in bg-hatch-lg"
              options={{
                arrows: false,
                drag: mediaItems.length > 1,
                gap: 0,
                pagination: false,
                perMove: 1,
                perPage: 1,
                rewind: mediaItems.length > 1,
                slideFocus: false,
                speed: 260,
                waitForTransition: false,
              }}
              onMoved={(_splide, index) => setActiveThumb(index)}
              onClick={(_splide, _slide, event) => {
                event.preventDefault();
                if (activeMedia?.kind === "image") setLightbox(true);
              }}
              aria-label={`Galeri media ${unit.nama}`}
            >
              {mediaItems.map((media, index) => (
                <SplideSlide key={media.id}>
                  {media.kind === "image" ? (
                    <Photo
                      large
                      className="h-full w-full"
                      src={mobixImage(media.url, MOBIX_HERO_WIDTH)}
                      placeholderSrc={mobixImage(media.url, MOBIX_THUMBNAIL_WIDTH)}
                      alt={index === activeThumb ? unit.nama : ""}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black">
                      <video
                        className="h-full w-full object-contain"
                        src={mobixMedia(media.url)}
                        controls
                        playsInline
                        preload="metadata"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
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
          {mediaItems.length > 0 && (
            <div className="absolute bottom-3.5 right-3.5 rounded-lg bg-ink/80 px-2.5 py-[3px] text-[11px] font-semibold text-surface">
              {activeThumb + 1} / {mediaItems.length}
            </div>
          )}
        </div>

        {/* LIGHTBOX */}
        {lightbox && activeMedia && (
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
            {activeMedia.kind === "image" ? (
              <img
                src={heroSrc}
                alt={unit.nama}
                className="max-h-screen max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={heroSrc}
                controls
                playsInline
                autoPlay
                className="max-h-screen max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}

        {/* THUMB STRIP */}
        {mediaItems.length > 1 && (
          <>
            <div className="scroll-x flex gap-2 overflow-x-auto px-4 py-3">
              {mediaItems.slice(0, thumbCount).map((media, i) => (
                <button
                  key={media.id}
                  onClick={() => selectMedia(i)}
                  className={`relative h-12 flex-[0_0_64px] overflow-hidden rounded-lg ${
                    i === activeThumb ? "ring-2 ring-ink" : ""
                  }`}
                >
                  {media.kind === "image" ? (
                    <Photo className="h-full w-full" src={mobixImage(media.url)} alt="" />
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
                </button>
              ))}
              {!showAllThumbs && mediaItems.length > thumbCount && (
                <button
                  onClick={() => setShowAllThumbs(true)}
                  className="flex h-12 flex-[0_0_64px] items-center justify-center rounded-lg bg-ink text-[12px] font-bold text-surface"
                >
                  +{mediaItems.length - thumbCount}
                </button>
              )}
            </div>

            {showAllThumbs && (
              <div className="grid grid-cols-4 gap-2 px-4 pb-3 pt-1">
                {mediaItems.slice(thumbCount).map((media, index) => {
                  const absoluteIndex = thumbCount + index;
                  return (
                    <button
                      key={media.id}
                      onClick={() => selectMedia(absoluteIndex)}
                      className={`relative h-12 overflow-hidden rounded-lg ${
                        absoluteIndex === activeThumb ? "ring-2 ring-ink" : ""
                      }`}
                    >
                      {media.kind === "image" ? (
                        <Photo className="h-full w-full" src={mobixImage(media.url)} alt="" />
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
              {priceDelta !== 0 && originalPrice > 0 && (
                <div className="mt-0.5 text-[11px] font-semibold text-muted">
                  Harga asli {formatRupiah(originalPrice)}
                </div>
              )}
              {smartCreditPriceLoading ? (
                <div className="mt-1 text-[12px] font-semibold text-muted">
                  Harga Kredit : Menghitung...
                </div>
              ) : smartCreditPriceError || hasCreditPriceIssue ? (
                <div className="mt-1 text-[12px] font-semibold text-danger">
                  Harga Kredit : Maaf, ada kendala sistem
                </div>
              ) : creditPriceForDisplay ? (
                <div className="mt-1 text-[12px] font-semibold text-teal-deep">
                  Harga Kredit : {formatRupiah(creditPriceForDisplay)}
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted">Est. komisi</div>
              <div className="text-[12px] font-bold text-teal-deep">
                {formatRupiah(estimatedCommission)}
              </div>
              {priceDelta !== 0 && (
                <div className="mt-0.5 text-[10px] font-semibold text-muted">
                  {priceDelta > 0
                    ? `+${formatRupiah(priceDelta)}`
                    : `-${formatRupiah(Math.abs(priceDelta))}`}
                </div>
              )}
            </div>
          </div>
          {originalPrice > 0 && (
            <div className="mt-3 rounded-[14px] border border-line bg-surface px-3.5 py-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="builder-price"
                  className="text-[11px] font-bold text-muted"
                >
                  Harga jual builder
                </label>
                {price !== originalPrice && (
                  <button
                    type="button"
                    onClick={() => commitBuilderPrice(originalPrice)}
                    className="text-[11px] font-semibold text-muted underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="shrink-0 text-[13px] font-semibold text-muted">Rp</span>
                <input
                  id="builder-price"
                  type="text"
                  inputMode="numeric"
                  value={builderPriceInput}
                  onChange={handleBuilderPriceChange}
                  onBlur={handleBuilderPriceBlur}
                  onKeyDown={handleBuilderPriceKeyDown}
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-ink outline-none"
                  aria-label="Harga jual builder"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted">
                <span>Minimum {formatRupiah(minimumBuilderPrice)}</span>
                <span>Turun maks. {formatRupiah(MAX_BUILDER_PRICE_DROP)}</span>
              </div>
            </div>
          )}
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
              <label className="mb-1.5 block text-[12px] font-semibold text-mid">
                Pilih metode
              </label>
              <select
                value={simulationMethod}
                onChange={handleSimulationMethodChange}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[13px] font-bold text-ink outline-none"
                aria-label="Pilih metode simulasi kredit"
              >
                <option value="DP">DP</option>
                <option value="TDP">TDP</option>
                <option value="Installment">Cicilan</option>
              </select>
            </div>

            {simulationMethod === "DP" && (
              <div className="mb-3.5">
                <div className="mb-1.5 text-[12px] font-semibold text-mid">
                  DP (Down Payment)
                </div>
                <div className="mb-2 grid grid-cols-[112px_26px_minmax(0,1fr)] items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dpPercentInput}
                    onChange={handleDpPercentChange}
                    onBlur={handleDpPercentBlur}
                    disabled={!price}
                    className="h-[62px] w-full rounded-xl border border-line bg-surface-2 px-3 text-center text-[16px] font-bold text-ink outline-none disabled:opacity-60"
                    aria-label="Persentase uang muka"
                  />
                  <span className="text-center text-[22px] font-bold text-ink">%</span>
                  <div className="flex h-[62px] min-w-0 items-center rounded-xl border border-line bg-surface-2 px-3">
                    <span className="pr-2 text-[15px] font-semibold text-muted">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dpAmountInput}
                      onChange={handleDpAmountChange}
                      onBlur={handleDpAmountBlur}
                      disabled={!price}
                      className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-ink outline-none disabled:opacity-60"
                      placeholder={simPending ? "Menghitung..." : ""}
                      aria-label="Total uang muka"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min={MIN_DP_PERCENT}
                  max={MAX_DP_PERCENT}
                  step={1}
                  value={dpPercent}
                  onChange={(e) => setDpPercent(Number(e.target.value))}
                  aria-label="Persentase uang muka"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E0E7E9] accent-ink"
                />
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-muted">
                  <span>{MIN_DP_PERCENT}%</span>
                  <span>{MAX_DP_PERCENT}%</span>
                </div>
              </div>
            )}

            {simulationMethod === "TDP" && (
              <div className="mb-3.5">
                <div className="mb-1.5 text-[12px] font-semibold text-mid">
                  Total Bayar Pertama
                </div>
                <div className="mb-2 flex items-center rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                  <span className="pr-2 text-[13px] font-semibold text-muted">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tdpAmountInput}
                    onChange={handleTdpAmountChange}
                    onBlur={handleTdpAmountBlur}
                    disabled={!price}
                    className="w-full bg-transparent text-[14px] font-bold text-ink outline-none disabled:opacity-60"
                    placeholder={simPending ? "Menghitung..." : ""}
                    aria-label="Total bayar pertama"
                  />
                </div>
                <input
                  type="range"
                  min={minTdpAmount}
                  max={maxTdpAmount}
                  step={100000}
                  value={tdpSimulationAmount}
                  onChange={(e) => setTdpAmount(Number(e.target.value))}
                  disabled={!price}
                  aria-label="Nominal total bayar pertama"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E0E7E9] accent-ink disabled:opacity-60"
                />
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-muted">
                  <span>{formatRupiah(minTdpAmount)}</span>
                  <span>{formatRupiah(maxTdpAmount)}</span>
                </div>
              </div>
            )}

            {simulationMethod === "Installment" && (
              <div className="mb-3.5">
                <div className="mb-1.5 text-[12px] font-semibold text-mid">
                  Cicilan per bulan
                </div>
                <div className="mb-2 flex items-center rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                  <span className="pr-2 text-[13px] font-semibold text-muted">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monthlyAmountInput}
                    onChange={handleMonthlyAmountChange}
                    onBlur={handleMonthlyAmountBlur}
                    disabled={!price}
                    className="w-full bg-transparent text-[14px] font-bold text-ink outline-none disabled:opacity-60"
                    placeholder={simPending ? "Menghitung..." : ""}
                    aria-label="Cicilan per bulan"
                  />
                </div>
                <input
                  type="range"
                  min={minMonthlyAmount}
                  max={maxMonthlyAmount}
                  step={10000}
                  value={monthlySimulationAmount}
                  onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                  disabled={!price}
                  aria-label="Nominal cicilan per bulan"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E0E7E9] accent-ink disabled:opacity-60"
                />
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-muted">
                  <span>{formatRupiah(minMonthlyAmount)}</span>
                  <span>{formatRupiah(maxMonthlyAmount)}</span>
                </div>
              </div>
            )}

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

            <button
              type="button"
              onClick={runDsfSimulation}
              disabled={!price || simLoading}
              className="mb-3 w-full rounded-[12px] bg-ink px-4 py-3 text-[13px] font-extrabold text-surface disabled:bg-ink/35"
            >
              {simLoading ? "Menghitung..." : "Hitung"}
            </button>

            <div
              className={`rounded-[14px] border border-line bg-surface-2 p-4 text-ink transition-opacity ${
                simLoading ? "opacity-60" : ""
              }`}
            >
              <div className="text-[14px] font-extrabold text-ink">
                Hasil Simulasi
              </div>
              {simPending ? (
                <div className="mt-2.5 border-t border-line pt-2.5 text-[13px] font-semibold text-mid">
                  Menghitung simulasi...
                </div>
              ) : simError ? (
                <div className="mt-2.5 border-t border-line pt-2.5">
                  <div className="text-[13px] font-extrabold text-ink">
                    Maaf, ada kendala sistem
                  </div>
                  <div className="mt-1 text-[11px] leading-[1.5] text-muted">
                    Harga kredit belum tersedia dari DSF. Coba refresh untuk mengambil ulang simulasi.
                  </div>
                  <button
                    type="button"
                    onClick={runDsfSimulation}
                    className="mt-3 rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-bold text-surface"
                  >
                    Hitung ulang
                  </button>
                </div>
              ) : (
                <div className="mt-2.5 space-y-2.5 border-t border-line pt-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold text-mid">
                      Biaya Admin
                    </div>
                    <div className="text-right text-[13px] font-extrabold text-ink">
                      {formatRupiah(displayAdminFee)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold text-mid">
                      Biaya Provisi
                    </div>
                    <div className="text-right text-[13px] font-extrabold text-ink">
                      Tanpa provisi
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold text-mid">
                      Total Bayar Pertama
                    </div>
                    <div className="text-right text-[13px] font-extrabold text-ink">
                      {displayTdp ? formatRupiah(displayTdp) : "-"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold text-mid">
                      Cicilan/Bulan
                    </div>
                    <div className="text-right text-[13px] font-extrabold text-ink">
                      {displayMonthly ? formatRupiah(displayMonthly) : "-"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold text-mid">
                      Tenor
                    </div>
                    <div className="text-right text-[13px] font-extrabold text-ink">
                      {tenor} Bulan
                    </div>
                  </div>
                </div>
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
