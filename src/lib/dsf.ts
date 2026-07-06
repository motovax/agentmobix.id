import { useEffect, useState } from "react";

const DSF_BASE = import.meta.env.VITE_DSF_BASE_URL || "https://simulation.dipostar.com";
const DSF_TOKEN = import.meta.env.VITE_DSF_BEARER_TOKEN || "";

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
  brand?: string;
  model?: string;
  year?: number;
}

function buildDsfSimulationPayload(params: DsfSimParams) {
  const { unitPrice, dpPercent, tenor, brand = "Unknown", model = "Unknown", year = 2020 } = params;

  return {
    UnitPrice: unitPrice,
    City: "JAKARTA SELATAN",
    Brand: brand,
    Model: model,
    ManufacturedYear: String(year),
    LoanPackageName: "MOCIL SPC - PC",
    PaymentType: "ADDB",
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
    SimulationValue: dpPercent,
    TenorInMonths: tenor,
  };
}

async function fetchDsfAllParams(
  params: DsfSimParams,
  signal?: AbortSignal,
): Promise<DsfAllParamsData | null> {
  const payload = buildDsfSimulationPayload(params);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DSF_TOKEN) headers.Authorization = `Bearer ${DSF_TOKEN}`;
  const res = await fetch(`${DSF_BASE}/api/calculator/tenor/allparams`, {
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
  let search: DsfCreditPriceResult | null = null;
  try {
    search = await findLowestCreditPrice(
      { ...params, unitPrice: seedPrice },
      cashTarget,
      signal,
    );
  } catch {
    search = null;
  }
  const unitPrice = search?.unitPrice || seedPrice || params.unitPrice;
  return simulateKreditWithSignal({ ...params, unitPrice }, signal);
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
