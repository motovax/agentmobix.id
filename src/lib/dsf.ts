import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_MOBIX_API_BASE || "https://mobix.motovax.com";
const API_KEY = import.meta.env.VITE_MOBIX_API_KEY || "";

export interface DsfSimResult {
  hargaKredit: number;
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
}

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
  refund?: {
    allInToSupplier?: number;
  };
}

export interface DsfSimParams {
  unitPrice: number;
  dpPercent: number;
  tenor: number;
  category?: string;
  brand?: string;
  model?: string;
  year?: number;
}

type DsfVehicleClass = "PC" | "CV";

interface DsfPolicy {
  vehicleClass: DsfVehicleClass;
  loanPackageName: string;
  paymentType: "ADDB" | "ADDM";
  minDpPercent: number;
  fixedDpPercent?: number;
}

const CV_CATEGORIES = new Set(["truck", "pickup", "van"]);

function normalizeCategory(category?: string) {
  return (category || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function isDsfCommercialVehicle(category?: string): boolean {
  return CV_CATEGORIES.has(normalizeCategory(category));
}

function resolvePcLoanPackageName(year: number) {
  if (year === 2012 || year === 2013) return "PAKET C";

  const age = new Date().getFullYear() - year;
  if (age < 10) return "PAKET C11";

  return "MOCIL SPC - PC";
}

export function resolveDsfPolicy(params: Pick<DsfSimParams, "category" | "tenor" | "year">): DsfPolicy {
  const year = params.year ?? 2020;
  if (isDsfCommercialVehicle(params.category)) {
    return {
      vehicleClass: "CV",
      loanPackageName: "MOCIL PLUS",
      paymentType: "ADDB",
      minDpPercent: 25,
      fixedDpPercent: 25,
    };
  }

  if (params.tenor === 12) {
    return {
      vehicleClass: "PC",
      loanPackageName: "MOCIL 1 YR",
      paymentType: "ADDM",
      minDpPercent: 30,
    };
  }

  return {
    vehicleClass: "PC",
    loanPackageName: resolvePcLoanPackageName(year),
    paymentType: "ADDB",
    minDpPercent: 15,
  };
}

export function normalizeDsfDpPercent(params: DsfSimParams): number {
  const policy = resolveDsfPolicy(params);
  if (policy.fixedDpPercent != null) return policy.fixedDpPercent;
  return Math.max(policy.minDpPercent, params.dpPercent);
}

function buildDsfSimulationPayload(params: DsfSimParams) {
  const { unitPrice, tenor, brand = "Unknown", model = "Unknown", year = 2020 } = params;
  const policy = resolveDsfPolicy({ category: params.category, tenor, year });

  return {
    UnitPrice: unitPrice,
    City: "JAKARTA SELATAN",
    Brand: brand,
    Model: model,
    ManufacturedYear: String(year),
    LoanPackageName: policy.loanPackageName,
    PaymentType: policy.paymentType,
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
    SimulationType: "DP",
    SimulationValue: normalizeDsfDpPercent(params),
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
      hargaKredit: d.harga_kredit || params.unitPrice,
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
    };
  } catch {
    return null;
  }
}

export interface DsfCreditPriceResult {
  unitPrice: number;
  allInToSupplier: number;
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
    return simulateKreditWithSignal({ ...params, unitPrice: search.unitPrice }, signal);
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

/** Hook untuk list view (UnitCard, UnitRow) dengan aturan DP DSF default tenor 60 bln. */
export function useDsfSim(price: number, title: string, year?: number, category?: string) {
  const [result, setResult] = useState<DsfSimResult | null>(null);

  useEffect(() => {
    if (!price) return;
    let alive = true;
    const parts = title.split(" ");
    simulateKredit({
      unitPrice: price,
      dpPercent: 15,
      tenor: 60,
      category,
      brand: parts[0],
      model: parts[1],
      year,
    }).then((r) => { if (alive) setResult(r); });
    return () => { alive = false; };
  }, [price, title, year, category]);

  return result;
}
