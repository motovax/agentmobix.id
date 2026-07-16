import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_MOBIX_API_BASE || "https://mobix.motovax.com";
const API_KEY = import.meta.env.VITE_MOBIX_API_KEY || "";

export interface DsfSimResult {
  hargaKredit: number | null;
  installmentRounded: number;
  totalDownPaymentRounded: number;
  downPaymentRounded: number;
  downPayment: number;
  percentDownPayment: number;
  totalLoan: number;
  rate: string;
  rateEffectiveTwoDigitPercent: string;
  adminFee: number;
  disclaimer: string[];
  netDisbursement: number;
  refundSupplier: number;
}

export type DsfSimMethod = "DP" | "TDP" | "Installment";

interface DsfAllParamsData {
  harga_kredit?: number;
  installmentRounded: number;
  totalDownPaymentRounded: number;
  downPaymentRounded: number;
  downPayment: number;
  percentDownPayment: number;
  totalLoan: number;
  rateTwoDigitPercent: string;
  rateEffectiveTwoDigitPercent: string;
  adminFee: number;
  disclaimer?: string[];
  netDisbursement?: number;
  refund?: {
    allInToSupplier?: number;
    netDisbursement?: number;
    refundSupplier?: number;
  };
}

export interface DsfSimParams {
  unitPrice: number;
  dpPercent: number;
  tenor: number;
  simulationType?: DsfSimMethod;
  simulationValue?: number;
  cashPriceTarget?: number;
  paymentType?: "ADDB" | "ADDM";
  brand?: string;
  model?: string;
  year?: number;
  category?: string;
}

export interface DsfSimulationRules {
  vehicleType: "PC" | "CV";
  minDpPercent: number;
  fixedDpPercent?: number;
  paymentType: "ADDB" | "ADDM";
  loanPackageName: string;
}

function isCvCategory(category?: string) {
  const normalized = (category ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return normalized === "truck" || normalized === "truk" || normalized === "pickup" || normalized === "van";
}

/** Resolve the DSF package rules for the unit and selected tenor. */
export function getDsfSimulationRules(
  params: Pick<DsfSimParams, "category" | "year" | "tenor">,
): DsfSimulationRules {
  if (isCvCategory(params.category)) {
    return {
      vehicleType: "CV",
      minDpPercent: 25,
      fixedDpPercent: 25,
      paymentType: "ADDB",
      loanPackageName: "MOCIL PLUS",
    };
  }

  if (params.tenor === 12) {
    return {
      vehicleType: "PC",
      minDpPercent: 30,
      paymentType: "ADDM",
      loanPackageName: "MOCIL 1 YR",
    };
  }

  // 2012-2013 is an explicit exception to the age-based package rule.
  if (params.year === 2012 || params.year === 2013) {
    return {
      vehicleType: "PC",
      minDpPercent: 15,
      paymentType: "ADDB",
      loanPackageName: "PAKET C",
    };
  }

  const manufacturedYear = params.year ?? 2020;
  const vehicleAge = new Date().getFullYear() - manufacturedYear;
  return {
    vehicleType: "PC",
    minDpPercent: 15,
    paymentType: "ADDB",
    loanPackageName: vehicleAge < 10 ? "PAKET C11" : "MOCIL SPC - PC",
  };
}

function buildDsfSimulationPayload(params: DsfSimParams) {
  const {
    unitPrice,
    dpPercent,
    tenor,
    simulationType = "DP",
    simulationValue,
    cashPriceTarget,
    brand = "Unknown",
    model = "Unknown",
    year = 2020,
  } = params;
  const rules = getDsfSimulationRules({ ...params, year });
  const effectiveSimulationValue =
    simulationType === "DP"
      ? rules.fixedDpPercent ?? Math.max(simulationValue ?? dpPercent, rules.minDpPercent)
      : simulationValue ?? dpPercent;

  return {
    UnitPrice: unitPrice,
    ...(cashPriceTarget && cashPriceTarget > 0 ? { CashPriceTarget: cashPriceTarget } : {}),
    City: "JAKARTA SELATAN",
    Brand: brand,
    Model: model,
    ManufacturedYear: String(year),
    LoanPackageName: rules.loanPackageName,
    PaymentType: rules.paymentType,
    Refund: {
      IsApplied: "YES",
      Showroom: "PT DIGITAL SUMBER SEJAHTERA MOTOR",
      RefundPercentage: 9,
    },
    Insurances: {
      InsuranceType: "TLO",
      PutAsOnLoan: "yes",
      AdditionalInsurances: [],
      TanggungJawabPihakKetiga: {
        IsApplied: "YES",
        UangPertanggungan: 10000000,
      },
    },
    Fee: {
      BeaPolis: 50000,
      AdminFee: 5500000,
    },
    SimulationType: simulationType,
    SimulationValue: effectiveSimulationValue,
    TenorInMonths: tenor,
  };
}

async function fetchDsfAllParams(
  params: DsfSimParams,
  signal?: AbortSignal,
): Promise<DsfAllParamsData | null> {
  const payload = buildDsfSimulationPayload(params);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}/kalkulator/allparams`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.status || !json.data) return null;
  return json.data;
}

export async function simulateKredit(params: DsfSimParams): Promise<DsfSimResult | null> {
  return simulateKreditWithSignal(params);
}

export async function simulateKreditWithSignal(
  params: DsfSimParams,
  signal?: AbortSignal,
): Promise<DsfSimResult | null> {
  try {
    const d = await fetchDsfAllParams(params, signal);
    if (!d) return null;
    return {
      hargaKredit: d.harga_kredit || null,
      installmentRounded: d.installmentRounded,
      totalDownPaymentRounded: d.totalDownPaymentRounded,
      downPaymentRounded: d.downPaymentRounded,
      downPayment: d.downPayment,
      percentDownPayment: d.percentDownPayment,
      totalLoan: d.totalLoan,
      rate: d.rateTwoDigitPercent,
      rateEffectiveTwoDigitPercent: d.rateEffectiveTwoDigitPercent,
      adminFee: d.adminFee,
      disclaimer: d.disclaimer ?? [],
      netDisbursement: d.netDisbursement ?? d.refund?.netDisbursement ?? 0,
      refundSupplier: d.refund?.refundSupplier ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse calculation ala paket leasing: cari OTR kredit (markup di atas
 * harga cash) yang menghasilkan cair all-in (cair murni + refund) mendekati
 * target. All-in DSF ~linear terhadap unit price, jadi iterasi proporsional
 * konvergen cepat (2-3 call).
 */
export async function findAllParamsForAllIn(
  params: DsfSimParams,
  targetAllIn: number,
  signal?: AbortSignal,
): Promise<DsfSimResult | null> {
  const cashPrice = params.unitPrice;
  if (!cashPrice || !targetAllIn) return null;

  const clampPrice = (value: number) =>
    Math.min(
      Math.max(Math.round(value / 1000) * 1000, 1000),
      cashPrice * 4,
    );

  let price = cashPrice;
  let best: DsfSimResult | null = null;

  for (let i = 0; i < 6; i += 1) {
    const result = await simulateKreditWithSignal(
      { ...params, unitPrice: price },
      signal,
    );
    const allIn =
      result && result.netDisbursement > 0
        ? result.netDisbursement + Math.max(0, result.refundSupplier)
        : 0;
    if (!result || allIn <= 0) return best;
    best = { ...result, hargaKredit: price };
    if (Math.abs(allIn - targetAllIn) <= 200000) return best;
    const next = clampPrice((price * targetAllIn) / allIn);
    if (next === price) return best;
    price = next;
  }
  return best;
}

export interface DsfCreditPriceResult {
  unitPrice: number;
  allInToSupplier: number;
}

export async function resolveSmartCreditPrice(
  params: DsfSimParams,
  cashTarget: number,
  signal?: AbortSignal,
): Promise<DsfCreditPriceResult | null> {
  if (!params.unitPrice || !cashTarget) return null;

  try {
    const data = await fetchDsfAllParams(
      { ...params, cashPriceTarget: cashTarget },
      signal,
    );
    const unitPrice = data?.harga_kredit ?? 0;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    return {
      unitPrice,
      allInToSupplier: data?.refund?.allInToSupplier ?? 0,
    };
  } catch {
    return null;
  }
}

export async function resolveMobixCreditSimulation(
  params: DsfSimParams,
  cashTarget: number,
  maxCreditPrice: number,
  signal?: AbortSignal,
): Promise<DsfSimResult | null> {
  const seedPrice = maxCreditPrice > 0 ? maxCreditPrice : params.unitPrice;
  try {
    const search = await findLowestCreditPrice(
      { ...params, unitPrice: seedPrice },
      cashTarget,
      signal,
    );
    if (!search) return null;
    const result = await simulateKreditWithSignal(
      { ...params, unitPrice: search.unitPrice },
      signal,
    );
    return result ? { ...result, hargaKredit: search.unitPrice } : null;
  } catch {
    return null;
  }
}

export async function findLowestCreditPrice(
  params: DsfSimParams,
  cashTarget: number,
  signal?: AbortSignal,
): Promise<DsfCreditPriceResult | null> {
  if (!params.unitPrice || !cashTarget) return null;

  async function evalPrice(unitPrice: number): Promise<DsfCreditPriceResult | null> {
    const data = await fetchDsfAllParams({ ...params, unitPrice }, signal);
    const allInToSupplier = data?.refund?.allInToSupplier ?? 0;
    if (allInToSupplier <= 0) return null;
    return { unitPrice, allInToSupplier };
  }

  let best = await evalPrice(params.unitPrice);
  if (!best || best.allInToSupplier < cashTarget) return null;

  let low = 0;
  let high = params.unitPrice;
  for (let i = 0; i < 14 && high - low > 1000; i += 1) {
    const mid = (low + high) / 2;
    const result = await evalPrice(mid);
    if (!result) {
      low = mid;
      continue;
    }
    if (result.allInToSupplier >= cashTarget) {
      best = result;
      high = mid;
    } else {
      low = mid;
    }
  }

  const rounded = Math.ceil(best.unitPrice / 1000) * 1000;
  if (rounded > 0 && rounded <= params.unitPrice && Math.abs(rounded - best.unitPrice) > 0.01) {
    const roundedResult = await evalPrice(rounded);
    if (roundedResult && roundedResult.allInToSupplier >= cashTarget) {
      best = roundedResult;
    }
  }

  return best;
}

/** Hook untuk list view (UnitCard, UnitRow) — fixed DP 15%, tenor 60 bln. */
export function useDsfSim(price: number, title: string, year?: number) {
  const [result, setResult] = useState<DsfSimResult | null>(null);

  useEffect(() => {
    if (!price) return;
    let alive = true;
    const parts = title.split(" ");
    simulateKredit({
      unitPrice: price,
      dpPercent: 15,
      tenor: 60,
      brand: parts[0],
      model: parts[1],
      year,
    }).then((r) => { if (alive) setResult(r); });
    return () => { alive = false; };
  }, [price, title, year]);

  return result;
}
