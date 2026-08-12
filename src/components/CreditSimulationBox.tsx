import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  financingValueLabel,
  requiresSalesContact,
  titleCase,
  type ProductDetail,
} from "../lib/mobix";
import { formatRupiah } from "../lib/format";
import {
  TENOR_OPTIONS,
  downPayment,
  monthlyInstallment,
  type Tenor,
} from "../lib/installment";
import {
  fetchDpMinimSimulation,
  getDpMinimAllInFromResult,
  getDpMinimTdpKonsumen,
  getDsfSimulationRules,
  resolveSmartCreditPrice,
  simulateKreditWithSignal,
  type DsfSimMethod,
  type DsfSimResult,
} from "../lib/dsf";
import { buildJasmineWhatsAppHref } from "../lib/jasmine";

const MIN_DP_PERCENT = 15;
const MAX_DP_PERCENT = 60;
const TDP_RANGE_MAX_PERCENT = 80;
const MIN_INSTALLMENT_RATE = 0.005;
const MAX_INSTALLMENT_RATE = 0.05;

export type SimTab = "reguler" | "dpminim" | "syariah";

const SIM_TABS: { id: SimTab; label: string }[] = [
  { id: "reguler", label: "Reguler" },
  { id: "dpminim", label: "DP Minim" },
  { id: "syariah", label: "Syariah" },
];

const DP_MINIM_TABLE_TENORS: Tenor[] = [60, 48, 36];

type DpMinimRow = { tenor: Tenor; result: DsfSimResult | null };

function dpMinimInstallmentCount(tenor: Tenor) {
  return tenor;
}

export type CreditSimulationResult = {
  simTab: SimTab;
  tenor: number;
  dp: number | null;
  dpPercent: number;
  tdp: number | null;
  cicilan: number | null;
  hargaKredit: number | null;
  canShare: boolean;
};

type CreditSimulationBoxProps = {
  unit: ProductDetail;
  price: number;
  defaultOpen?: boolean;
  initialTenor?: number;
  initialDpPercent?: number;
  onSimulationChange?: (result: CreditSimulationResult) => void;
};

export function CreditSimulationBox({
  unit,
  price,
  defaultOpen = false,
  initialTenor,
  initialDpPercent,
  onSimulationChange,
}: CreditSimulationBoxProps) {
  const [simulationOpen, setSimulationOpen] = useState(defaultOpen);
  const [dpPercent, setDpPercent] = useState(initialDpPercent ?? MIN_DP_PERCENT);
  const [simTab, setSimTab] = useState<SimTab>("reguler");
  const [simulationMethod, setSimulationMethod] = useState<DsfSimMethod>("DP");
  const [tenor, setTenor] = useState<Tenor>(
    (TENOR_OPTIONS.includes((initialTenor as Tenor) ?? 60)
      ? (initialTenor as Tenor)
      : 60),
  );
  const [dpPercentInput, setDpPercentInput] = useState(
    String(initialDpPercent ?? MIN_DP_PERCENT),
  );
  const [dpAmountInput, setDpAmountInput] = useState("");
  const [tdpAmount, setTdpAmount] = useState(0);
  const [tdpAmountInput, setTdpAmountInput] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [monthlyAmountInput, setMonthlyAmountInput] = useState("");
  const [dpMinimRows, setDpMinimRows] = useState<DpMinimRow[] | null>(null);
  const [dpMinimTableLoading, setDpMinimTableLoading] = useState(false);
  const [dpMinimTableKey, setDpMinimTableKey] = useState(0);
  const [simResult, setSimResult] = useState<DsfSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(false);
  const [simRunKey, setSimRunKey] = useState(0);
  const [smartCreditPrice, setSmartCreditPrice] = useState<number | null>(null);
  const [smartCreditPriceLoading, setSmartCreditPriceLoading] = useState(false);
  const [smartCreditPriceError, setSmartCreditPriceError] = useState(false);

  const financingEligible = unit.pembiayaan.eligible === true;
  const salesContactRequired = requiresSalesContact(unit.pembiayaan);
  const dsfRules = getDsfSimulationRules({
    category: unit.category,
    year: unit.year,
    tenor,
  });
  const minDsfDpPercent = dsfRules.minDpPercent;
  const maxDsfDpPercent = dsfRules.fixedDpPercent ?? MAX_DP_PERCENT;
  const availableDsfTenors = useMemo(
    () => TENOR_OPTIONS.filter((value) => value <= dsfRules.maxTenorMonths),
    [dsfRules.maxTenorMonths],
  );
  const dpMinimTableTenors = useMemo(
    () =>
      DP_MINIM_TABLE_TENORS.filter(
        (value) => value <= dsfRules.maxTenorMonths,
      ),
    [dsfRules.maxTenorMonths],
  );
  const currencyFormatter = new Intl.NumberFormat("id-ID");

  const creditPriceForBounds = price;
  const minTdpAmount = Math.max(
    0,
    Math.round(unit.tdp && unit.tdp > 0 ? unit.tdp : creditPriceForBounds * (minDsfDpPercent / 100)),
  );
  const maxTdpAmount = Math.max(
    minTdpAmount,
    Math.round(creditPriceForBounds * (TDP_RANGE_MAX_PERCENT / 100)),
  );
  const minMonthlyAmount = Math.max(0, Math.round(creditPriceForBounds * MIN_INSTALLMENT_RATE));
  const estimatedSafeMaxMonthlyAmount =
    creditPriceForBounds > 0
      ? Math.floor(
          monthlyInstallment(creditPriceForBounds, minDsfDpPercent, tenor) / 10000,
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
    displayTdp ?? (unit.tdp && unit.tdp > 0 ? unit.tdp : minTdpAmount);
  const defaultMonthlyAmount =
    displayMonthly ??
    (unit.cicilan && unit.cicilan > 0 ? Math.round(unit.cicilan) : minMonthlyAmount);
  const tdpSimulationAmount = tdpAmount > 0 ? tdpAmount : defaultTdpAmount;
  const monthlySimulationAmount =
    monthlyAmount > 0 ? monthlyAmount : defaultMonthlyAmount;
  const simPending = financingEligible && price > 0 && simResult === null && !simError;
  const simCreditPrice =
    typeof simResult?.hargaKredit === "number" &&
    Number.isFinite(simResult.hargaKredit) &&
    simResult.hargaKredit > 0
      ? simResult.hargaKredit
      : null;
  const creditPriceForDisplay =
    simTab === "dpminim" && simCreditPrice !== null
      ? simCreditPrice
      : typeof smartCreditPrice === "number" &&
          Number.isFinite(smartCreditPrice) &&
          smartCreditPrice > 0
        ? smartCreditPrice
        : null;
  const displayAdminFee =
    typeof simResult?.adminFee === "number" &&
    Number.isFinite(simResult.adminFee) &&
    simResult.adminFee > 0
      ? simResult.adminFee
      : 5500000;
  const dpMinimAllIn = getDpMinimAllInFromResult(simResult);
  const dpMinimTdpKonsumen = getDpMinimTdpKonsumen(price, dpMinimAllIn);
  const dpMinimSisaCair =
    dpMinimAllIn !== null && price > 0 ? Math.max(0, dpMinimAllIn - price) : null;
  const shareDp = simTab === "dpminim" ? dpMinimTdpKonsumen : displayDp;
  const shareDpPercent =
    simTab === "dpminim" && shareDp !== null && price > 0
      ? (shareDp / price) * 100
      : displayDpPercent;
  const shareTdp = simTab === "dpminim" ? dpMinimTdpKonsumen : displayTdp;
  const canShareSimulation =
    shareDp !== null &&
    displayMonthly !== null &&
    shareTdp !== null &&
    creditPriceForDisplay !== null;
  const shareTenor = simTab === "dpminim" ? dpMinimInstallmentCount(tenor) : tenor;

  const unitCalculationMessage = salesContactRequired
    ? `Halo Jasmine, saya mau menanyakan opsi pembiayaan lain untuk unit *${unit.nama}* (plat ${unit.plate_no}) di cabang ${titleCase(unit.lokasi || "Mobix")}, harga ${formatRupiah(price)}. Pembiayaan DSF tidak tersedia untuk unit ini.`
    : `Halo Admin, saya mau minta hitungan leasing untuk unit *${unit.nama}* (plat ${unit.plate_no}) di cabang ${titleCase(unit.lokasi || "Mobix")}, harga ${formatRupiah(price)}.\n1. DP minim\n2. Cicilan ringan\n3. Cair All in`;
  const jasmineCalculationHref = buildJasmineWhatsAppHref(unitCalculationMessage);

  function formatDpValue(value: number) {
    return currencyFormatter.format(Math.max(0, Math.round(value || 0)));
  }

  function clampValue(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function parseCurrencyInput(value: string) {
    return Number(value.replace(/\D/g, ""));
  }

  function toDpPercentFromAmount(amount: number) {
    if (!price) return minDsfDpPercent;
    const next = Math.round((amount / price) * 100);
    if (Number.isNaN(next)) return minDsfDpPercent;
    return clampValue(next, minDsfDpPercent, maxDsfDpPercent);
  }

  useEffect(() => {
    const nextPercent = dsfRules.fixedDpPercent ?? Math.max(dpPercent, minDsfDpPercent);
    if (nextPercent !== dpPercent) {
      setDpPercent(nextPercent);
      setDpPercentInput(String(nextPercent));
    }
  }, [dpPercent, dsfRules.fixedDpPercent, minDsfDpPercent]);

  useEffect(() => {
    if (tenor > dsfRules.maxTenorMonths) {
      setTenor(dsfRules.maxTenorMonths as Tenor);
    }
  }, [dsfRules.maxTenorMonths, tenor]);

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
      setMonthlyAmount(clampValue(displayMonthly, minMonthlyAmount, maxMonthlyAmount));
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
    if (nextAmount !== monthlyAmount) setMonthlyAmount(nextAmount);
  }, [
    simulationMethod,
    price,
    monthlyAmount,
    displayMonthly,
    defaultMonthlyAmount,
    minMonthlyAmount,
    maxMonthlyAmount,
  ]);

  useEffect(() => {
    if (!financingEligible || !price) {
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
          dpPercent: minDsfDpPercent,
          simulationType: "DP",
          simulationValue: minDsfDpPercent,
          tenor,
          brand: unit.brand,
          model: unit.type,
          year: unit.year,
          category: unit.category,
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
  }, [
    financingEligible,
    price,
    unit.brand,
    unit.type,
    unit.year,
    unit.category,
    tenor,
    minDsfDpPercent,
  ]);

  useEffect(() => {
    if (!financingEligible || !price) {
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
    const isDpMinim = simTab === "dpminim";
    (async () => {
      const result = isDpMinim
        ? await fetchDpMinimSimulation(
            {
              unitPrice: price,
              tenor,
              brand: unit.brand,
              model: unit.type,
              year: unit.year,
              category: unit.category,
            },
            controller.signal,
          )
        : await simulateKreditWithSignal(
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
              brand: unit.brand,
              model: unit.type,
              year: unit.year,
              category: unit.category,
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
    financingEligible,
    price,
    unit.brand,
    unit.type,
    unit.year,
    unit.category,
    simTab,
    simulationMethod,
    dpPercent,
    tdpAmount,
    monthlyAmount,
    tenor,
    simRunKey,
  ]);

  useEffect(() => {
    if (!financingEligible || simTab !== "dpminim" || !price) {
      setDpMinimRows(null);
      setDpMinimTableLoading(false);
      return;
    }
    let alive = true;
    const controller = new AbortController();
    setDpMinimRows(null);
    setDpMinimTableLoading(true);
    (async () => {
      const results = await Promise.all(
        dpMinimTableTenors.map((rowTenor) =>
          fetchDpMinimSimulation(
            {
              unitPrice: price,
              tenor: rowTenor,
              brand: unit.brand,
              model: unit.type,
              year: unit.year,
              category: unit.category,
            },
            controller.signal,
          ),
        ),
      );
      if (!alive) return;
      setDpMinimRows(
        dpMinimTableTenors.map((rowTenor, index) => ({
          tenor: rowTenor,
          result: results[index],
        })),
      );
      setDpMinimTableLoading(false);
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [
    financingEligible,
    simTab,
    price,
    unit.brand,
    unit.type,
    unit.year,
    unit.category,
    dpMinimTableKey,
    dpMinimTableTenors,
  ]);

  useEffect(() => {
    onSimulationChange?.({
      simTab,
      tenor: shareTenor,
      dp: shareDp,
      dpPercent: shareDpPercent,
      tdp: shareTdp,
      cicilan: displayMonthly,
      hargaKredit: creditPriceForDisplay,
      canShare: canShareSimulation,
    });
  }, [
    simTab,
    shareTenor,
    shareDp,
    shareDpPercent,
    shareTdp,
    displayMonthly,
    creditPriceForDisplay,
    canShareSimulation,
    onSimulationChange,
  ]);

  function handleDpPercentChange(e: ChangeEvent<HTMLInputElement>) {
    setDpPercentInput(e.target.value.replace(/[^\d.]/g, ""));
  }

  function handleDpPercentBlur() {
    const parsed = Number(dpPercentInput);
    const nextPercent = Number.isFinite(parsed)
      ? clampValue(parsed, minDsfDpPercent, maxDsfDpPercent)
      : minDsfDpPercent;
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

  function handleSimTabChange(nextTab: SimTab) {
    if (nextTab === simTab) return;
    setSimTab(nextTab);
    if (nextTab === "syariah") return;
    setSimResult(null);
    setSimError(false);
    setSimRunKey((value) => value + 1);
  }

  function handleTenorSelect(nextTenor: Tenor) {
    setTenor(nextTenor);
  }

  function handleDpMinimRowSelect(nextTenor: Tenor) {
    setTenor(nextTenor);
    setSimResult(null);
    setSimError(false);
    setSimRunKey((value) => value + 1);
  }

  function handleSimulationMethodChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextMethod = e.target.value as DsfSimMethod;
    setSimulationMethod(nextMethod);
    if (nextMethod === "DP") {
      setDpPercent(clampValue(displayDpPercent, minDsfDpPercent, maxDsfDpPercent));
      return;
    }
    if (nextMethod === "TDP") {
      setTdpAmount(
        clampValue(displayTdp ?? tdpSimulationAmount, minTdpAmount, maxTdpAmount),
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

  const summaryText = salesContactRequired
    ? "Tanya sales untuk opsi pembiayaan"
    : `Reguler · DP ${Math.round(displayDpPercent)}% · ${tenor} bln · Cicilan ${displayMonthly ? formatRupiah(displayMonthly) : "Menghitung..."}/bln`;

  return (
    <div id="simulasi-kredit" className="mb-[18px] scroll-mt-4 overflow-hidden rounded-[18px] border border-line bg-surface">
      <button
        type="button"
        aria-expanded={simulationOpen}
        onClick={() => setSimulationOpen((open) => !open)}
        className={`flex w-full items-center gap-3 bg-surface px-4 py-3 text-left ${simulationOpen ? "border-b border-line" : ""}`}
      >
        <span className="flex-1">
          <span className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
            Simulasi kredit
            <span className="rounded-[7px] bg-teal-tint px-2 py-[3px] text-[11px] font-bold text-teal-deep">
              {canShareSimulation ? "Bisa di-share" : "Menunggu DSF"}
            </span>
          </span>
          <span className="mt-1 block truncate text-[12px] font-semibold text-muted">
            {summaryText}
          </span>
        </span>
        <span
          className={`text-[22px] leading-none text-muted transition-transform ${simulationOpen ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>

      {simulationOpen &&
        (salesContactRequired ? (
          <div className="p-3">
            <div className="rounded-[18px] border border-[#E8C98B] bg-[#FFF8E8] p-4">
              <div className="inline-flex rounded-full bg-[#F7DFAC] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7A4700]">
                Tidak eligible DSF
              </div>
              <div className="mt-2.5 text-[15px] font-extrabold text-ink">
                Simulasi kredit DSF tidak tersedia
              </div>
              <p className="m-0 mt-1.5 text-[12px] leading-[1.6] text-mid">
                {unit.pembiayaan.message || "Pembiayaan DSF tidak tersedia untuk unit ini."}
              </p>
              <div className="mt-3 space-y-2 rounded-[12px] bg-white/70 p-3 text-[12px]">
                {["Harga Kredit", "TDP", "Cicilan"].map((label) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-mid">{label}</span>
                    <span className="font-extrabold text-[#7A4700]">
                      {financingValueLabel(unit.pembiayaan, "")}
                    </span>
                  </div>
                ))}
              </div>
              <a
                href={jasmineCalculationHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center rounded-[12px] bg-ink px-4 py-3 text-[13px] font-extrabold text-surface no-underline"
              >
                Tanya opsi pembiayaan lain
              </a>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div>
              <div className="mb-3.5 flex items-center justify-between">
                <div className="-tracking-[0.01em] text-[15px] font-extrabold">
                  Simulasi Hitung Kredit
                </div>
                <span className="rounded-[7px] bg-teal-tint px-2 py-[3px] text-[11px] font-bold text-teal-deep">
                  {canShareSimulation ? "Bisa di-share" : "Menunggu DSF"}
                </span>
              </div>

              {!smartCreditPriceLoading && !smartCreditPriceError && creditPriceForDisplay ? (
                <div className="mb-3 rounded-xl bg-teal-tint px-3 py-2.5 text-[12px] font-bold text-teal-deep">
                  Harga Kredit : {formatRupiah(creditPriceForDisplay)}
                </div>
              ) : null}

              <div className="mb-3.5 grid grid-cols-3 gap-1 rounded-full border border-line bg-surface-2 p-1">
                {SIM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSimTabChange(tab.id)}
                    className={`rounded-full py-2 text-center text-[12px] ${
                      simTab === tab.id
                        ? "bg-ink font-bold text-surface"
                        : "font-semibold text-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {simTab === "reguler" && (
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
              )}

              {simTab === "reguler" && simulationMethod === "DP" && (
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
                    min={minDsfDpPercent}
                    max={maxDsfDpPercent}
                    step={1}
                    value={dpPercent}
                    onChange={(e) => setDpPercent(Number(e.target.value))}
                    aria-label="Persentase uang muka"
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E0E7E9] accent-ink"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-muted">
                    <span>{minDsfDpPercent}%</span>
                    <span>{maxDsfDpPercent}%</span>
                  </div>
                </div>
              )}

              {simTab === "reguler" && simulationMethod === "TDP" && (
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

              {simTab === "reguler" && simulationMethod === "Installment" && (
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

              {simTab === "dpminim" && (
                <>
                  <div className="mb-3.5 rounded-xl bg-field px-3.5 py-3 text-[11px] leading-[1.5] text-mid">
                    DP Minim dihitung dari harga aktif dikurangi pencairan murni dan refund
                    aktual DSF. Pilih tenor untuk melihat hasilnya.
                  </div>
                  <div className="mb-3.5 overflow-hidden rounded-[14px] border border-line">
                    {dpMinimTableTenors.map((rowTenor) => {
                      const row = dpMinimRows?.find((r) => r.tenor === rowTenor);
                      const res = row?.result ?? null;
                      const rowAllIn = getDpMinimAllInFromResult(res);
                      const rowDp = getDpMinimTdpKonsumen(price, rowAllIn);
                      const pending = dpMinimTableLoading && !res;
                      const isActive = rowTenor === tenor;
                      return (
                        <button
                          key={rowTenor}
                          type="button"
                          onClick={() => handleDpMinimRowSelect(rowTenor)}
                          className={`grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-line px-3.5 py-3 text-left last:border-b-0 ${
                            isActive ? "bg-field" : "bg-surface"
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-[17px] font-extrabold leading-none text-ink">
                              {dpMinimInstallmentCount(rowTenor)}
                            </div>
                            <div className="mt-0.5 text-[9px] font-bold tracking-wide text-muted">
                              KALI
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-muted">Pencairan + Refund</span>
                              <span className="font-bold text-ink">
                                {pending
                                  ? "Menghitung..."
                                  : rowAllIn !== null
                                    ? formatRupiah(rowAllIn)
                                    : "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-muted">Angsuran</span>
                              <span className="font-bold text-ink">
                                {pending
                                  ? "..."
                                  : res
                                    ? `${formatRupiah(res.installmentRounded)} x ${dpMinimInstallmentCount(rowTenor)}`
                                    : "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-muted">DP Minim Real</span>
                              <span className="text-[13px] font-extrabold text-teal-deep">
                                {pending
                                  ? "..."
                                  : rowDp !== null
                                    ? formatRupiah(rowDp)
                                    : "-"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {!dpMinimTableLoading &&
                    dpMinimRows !== null &&
                    dpMinimRows.some((row) => row.result === null) && (
                      <button
                        type="button"
                        onClick={() => setDpMinimTableKey((value) => value + 1)}
                        className="mb-3.5 w-full rounded-[10px] border border-line px-3.5 py-2 text-[12px] font-bold text-ink"
                      >
                        Hitung ulang tabel
                      </button>
                    )}
                </>
              )}

              {simTab !== "syariah" && (
                <>
                  <div className="mb-3.5">
                    <div className="mb-2 text-[12px] font-semibold text-mid">
                      {simTab === "dpminim" ? "Jumlah angsuran" : "Tenor (bulan)"}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {availableDsfTenors.map((t) => {
                        const isActive = t === tenor;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleTenorSelect(t)}
                            className={`rounded-[9px] py-[9px] text-center text-[12px] ${
                              isActive
                                ? "border-2 border-ink bg-ink font-bold text-surface"
                                : "border border-[#D4DEDF] font-semibold text-muted"
                            }`}
                          >
                            {simTab === "dpminim" ? dpMinimInstallmentCount(t) : t}
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
                </>
              )}

              {simTab === "syariah" && (
                <div className="rounded-[14px] border border-line bg-surface-2 p-5 text-center">
                  <div className="text-[22px]">🌙</div>
                  <div className="mt-1 text-[14px] font-extrabold text-ink">Coming Soon</div>
                  <div className="mt-1 text-[12px] leading-[1.5] text-muted">
                    Simulasi pembiayaan syariah segera hadir di Mobix.
                  </div>
                </div>
              )}

              {simTab !== "syariah" && (
                <div
                  className={`rounded-[14px] border border-line bg-surface-2 p-4 text-ink transition-opacity ${
                    simLoading ? "opacity-60" : ""
                  }`}
                >
                  <div className="text-[14px] font-extrabold text-ink">Hasil Simulasi</div>
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
                        Hasil simulasi belum tersedia dari DSF. Coba hitung ulang.
                      </div>
                      <button
                        type="button"
                        onClick={runDsfSimulation}
                        className="mt-3 rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-bold text-surface"
                      >
                        Hitung ulang
                      </button>
                    </div>
                  ) : simTab === "dpminim" ? (
                    dpMinimAllIn === null ? (
                      <div className="mt-2.5 border-t border-line pt-2.5">
                        <div className="text-[13px] font-extrabold text-ink">
                          Maaf, ada kendala sistem
                        </div>
                        <div className="mt-1 text-[11px] leading-[1.5] text-muted">
                          Data refund belum tersedia dari DSF. Coba hitung ulang simulasi.
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
                          <div className="text-[12px] font-semibold text-mid">Cair All In</div>
                          <div className="text-right text-[13px] font-extrabold text-ink">
                            {formatRupiah(dpMinimAllIn)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[12px] font-semibold text-mid">
                            DP Minim Real
                          </div>
                          <div className="text-right text-[15px] font-extrabold text-teal-deep">
                            {dpMinimTdpKonsumen !== null
                              ? formatRupiah(dpMinimTdpKonsumen)
                              : "-"}
                          </div>
                        </div>
                        {dpMinimSisaCair !== null && dpMinimSisaCair > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[12px] font-semibold text-mid">
                              Sisa Cair (Dana Tunai)
                            </div>
                            <div className="text-right text-[13px] font-extrabold text-teal-deep">
                              {formatRupiah(dpMinimSisaCair)}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[12px] font-semibold text-mid">Cicilan/Bulan</div>
                          <div className="text-right text-[13px] font-extrabold text-ink">
                            {displayMonthly
                              ? `${formatRupiah(displayMonthly)} x ${dpMinimInstallmentCount(tenor)}`
                              : "-"}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[12px] font-semibold text-mid">
                            Jumlah Angsuran
                          </div>
                          <div className="text-right text-[13px] font-extrabold text-ink">
                            {dpMinimInstallmentCount(tenor)}x
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="mt-2.5 space-y-2.5 border-t border-line pt-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[12px] font-semibold text-mid">Biaya Admin</div>
                        <div className="text-right text-[13px] font-extrabold text-ink">
                          {formatRupiah(displayAdminFee)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[12px] font-semibold text-mid">Biaya Provisi</div>
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
                        <div className="text-[12px] font-semibold text-mid">Cicilan/Bulan</div>
                        <div className="text-right text-[13px] font-extrabold text-ink">
                          {displayMonthly ? formatRupiah(displayMonthly) : "-"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[12px] font-semibold text-mid">Tenor</div>
                        <div className="text-right text-[13px] font-extrabold text-ink">
                          {tenor} Bulan
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="m-0 mt-2 text-[11px] text-muted">
                {simTab === "dpminim"
                  ? "DP Minim Real = harga aktif − (pencairan murni + refund aktual DSF). Syarat dan ketentuan berlaku; komisi bersifat estimasi."
                  : "Simulasi, syarat & ketentuan berlaku. Komisi bersifat estimasi."}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
