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
  refundSupplierActual: number;
  allInToSupplier: number;
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
    refundSupplierActual?: number;
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
  maxTenorMonths: 48 | 60;
  paymentType: "ADDB" | "ADDM";
  loanPackageName: string;
  refundPercentage: number;
  eligible: boolean;
}

function isCvCategory(category?: string) {
  const normalized = (category ?? "").trim().toLowerCase();
  return [
    "truk",
    "truck",
    "pickup",
    "pick-up",
    "box",
    "niaga",
    "tronton",
    "bus",
    "microbus",
    "blind van",
    "van",
    "cv",
  ].some((keyword) => normalized.includes(keyword));
}

/** Resolve the DSF package rules for the unit and selected tenor. */
export function getDsfSimulationRules(
  params: Pick<DsfSimParams, "category" | "year" | "tenor">,
): DsfSimulationRules {
  if (isCvCategory(params.category)) {
    return {
      vehicleType: "CV",
      minDpPercent: 20,
      fixedDpPercent: 20,
      maxTenorMonths: 60,
      paymentType: "ADDB",
      loanPackageName: "MOCIL PLUS",
      refundPercentage: 10,
      eligible: true,
    };
  }

  const manufacturedYear = params.year ?? 0;
  const vehicleAge = new Date().getFullYear() - manufacturedYear;
  if (manufacturedYear < 2012 || vehicleAge > 14) {
    return {
      vehicleType: "PC",
      minDpPercent: 20,
      fixedDpPercent: 20,
      maxTenorMonths: 48,
      paymentType: "ADDB",
      loanPackageName: "Non-DSF",
      refundPercentage: 0,
      eligible: false,
    };
  }

  if (vehicleAge <= 10) {
    return {
      vehicleType: "PC",
      minDpPercent: 15,
      maxTenorMonths: 60,
      paymentType: "ADDB",
      loanPackageName: "MOCIL PLUS",
      refundPercentage: 10,
      eligible: true,
    };
  }
  return {
    vehicleType: "PC",
    minDpPercent: 20,
    maxTenorMonths: 48,
    paymentType: "ADDB",
    loanPackageName:
      vehicleAge === 11
        ? "PAKET C11"
        : vehicleAge === 12
          ? "PAKET C12"
          : "PAKET C",
    refundPercentage: 9,
    eligible: true,
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
  if (!rules.eligible) {
    throw new Error("Unit tidak eligible untuk simulasi pembiayaan DSF");
  }
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
      RefundPercentage: rules.refundPercentage,
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
    TenorInMonths: Math.min(tenor, rules.maxTenorMonths),
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
    const netDisbursement = d.netDisbursement ?? d.refund?.netDisbursement ?? 0;
    const refundSupplierActual = d.refund?.refundSupplierActual ?? 0;
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
      netDisbursement,
      refundSupplierActual,
      allInToSupplier:
        d.refund?.allInToSupplier ??
        (netDisbursement > 0
          ? netDisbursement + Math.max(0, refundSupplierActual)
          : 0),
    };
  } catch {
    return null;
  }
}

/** Pencairan + refund aktual DSF untuk rumus DP Minim. */
export function getDpMinimAllInFromResult(
  result: DsfSimResult | null,
): number | null {
  if (!result) return null;
  if (
    Number.isFinite(result.netDisbursement) &&
    result.netDisbursement > 0
  ) {
    return (
      result.netDisbursement +
      Math.max(0, result.refundSupplierActual ?? 0)
    );
  }
  return null;
}

/**
 * TDP bayar konsumen = OTR real − (netDisbursement + refundSupplierActual).
 * Bukan totalDownPaymentRounded DSF dan tidak memakai target All In.
 */
export function getDpMinimTdpKonsumen(
  realOtr: number,
  allIn: number | null,
): number | null {
  if (allIn === null || !Number.isFinite(allIn) || realOtr <= 0) return null;
  return Math.max(0, realOtr - allIn);
}

export interface DpMinimPackage {
  tdp: number;
  cicilan: number;
  tenor: number;
  dpPercent: number;
}

/**
 * Fetch paket DP Minim untuk tenor tertentu (default 60).
 * Dipakai caption share default agar di bawah harga selalu ada DP Minim 60.
 * Formula: harga unit aktual − (pencairan murni + refund aktual DSF).
 */
export async function fetchDpMinimPackage(
  params: {
    unitPrice: number;
    brand?: string;
    model?: string;
    year?: number;
    category?: string;
    tenor?: number;
  },
  signal?: AbortSignal,
): Promise<DpMinimPackage | null> {
  const tenor = params.tenor ?? 60;
  if (!params.unitPrice || params.unitPrice <= 0) return null;

  const rules = getDsfSimulationRules({
    category: params.category,
    year: params.year,
    tenor,
  });
  if (!rules.eligible) return null;
  const effectiveTenor = Math.min(tenor, rules.maxTenorMonths);

  const result = await fetchDpMinimSimulation(
    { ...params, tenor: effectiveTenor },
    signal,
  );
  const allIn = getDpMinimAllInFromResult(result);
  const tdp = getDpMinimTdpKonsumen(params.unitPrice, allIn);
  if (
    !result ||
    tdp === null ||
    !Number.isFinite(result.installmentRounded) ||
    result.installmentRounded <= 0
  ) {
    return null;
  }

  return {
    tdp,
    cicilan: result.installmentRounded,
    tenor: effectiveTenor,
    dpPercent: rules.minDpPercent,
  };
}

/** Simulasi DP minimum pada harga unit aktual dan DP murni minimum DSF. */
export function getDpMinimSimulationParams(
  params: {
    unitPrice: number;
    brand?: string;
    model?: string;
    year?: number;
    category?: string;
    tenor: number;
  },
): DsfSimParams | null {
  if (!params.unitPrice || params.unitPrice <= 0) return null;
  const rules = getDsfSimulationRules(params);
  if (!rules.eligible) return null;

  return {
    ...params,
    tenor: Math.min(params.tenor, rules.maxTenorMonths),
    dpPercent: rules.minDpPercent,
    simulationType: "DP",
    simulationValue: rules.minDpPercent,
    paymentType: rules.paymentType,
  };
}

export async function fetchDpMinimSimulation(
  params: Parameters<typeof getDpMinimSimulationParams>[0],
  signal?: AbortSignal,
): Promise<DsfSimResult | null> {
  const simulationParams = getDpMinimSimulationParams(params);
  if (!simulationParams) return null;
  return simulateKreditWithSignal(simulationParams, signal);
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

/** Hook untuk list view; payload menyesuaikan DP minimum dan tenor dari usia unit. */
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
