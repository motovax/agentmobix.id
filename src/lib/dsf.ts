import { useEffect, useState } from "react";

const PROXY = import.meta.env.VITE_MOBIX_PROXY ?? "";

export interface DsfSimResult {
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

export interface DsfSimParams {
  unitPrice: number;
  dpPercent: number;
  tenor: number;
  brand?: string;
  model?: string;
  year?: number;
}

export async function simulateKredit(params: DsfSimParams): Promise<DsfSimResult | null> {
  const { unitPrice, dpPercent, tenor, brand = "Unknown", model = "Unknown", year = 2020 } = params;

  const payload = {
    UnitPrice: unitPrice,
    City: "JAKARTA SELATAN",
    Brand: (brand ?? "").toUpperCase(),
    Model: (model ?? "").toUpperCase(),
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
      TanggungJawabPihakKetiga: {
        IsApplied: "YES",
        UangPertanggungan: 10000000,
      },
    },
    Fee: { BeaPolis: 50000, AdminFee: 5500000 },
    SimulationType: "DP",
    SimulationValue: dpPercent,
    TenorInMonths: tenor,
  };

  try {
    const res = await fetch(`${PROXY}/api/dsf/api/calculator/tenor/allparams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.status || !json.data) return null;
    const d = json.data;
    return {
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
