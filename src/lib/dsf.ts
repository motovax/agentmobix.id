const PROXY = import.meta.env.VITE_MOBIX_PROXY ?? "";

export interface DsfSimResult {
  TotalRoundedDownPayment: number;
  TotalRoundedInstallment: number;
  DownPaymentPercentage: number;
  TotalLoan: number;
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
    Province: "DKI JAKARTA",
    City: "JAKARTA SELATAN",
    Brand: brand,
    Model: model,
    Variant: model,
    VehicleType: "MOBIL",
    ManufacturedYear: String(year),
    LoanPackageName: "BCA",
    PaymentType: "ADDB",
    Insurances: {
      VehicleType: "MOBIL",
      InsuranceType: "TLO",
      AdditionalInsurances: [],
      LifeInsurance: "yes",
      TanggungJawabPihakKetiga: { IsApplied: "yes", UangPertanggungan: 0 },
      PutAsOnLoan: "yes",
    },
    Fee: { BeaPolis: 25000, AdminFee: 0 },
    ProvisionPercentage: 0,
    SimulationType: "DP",
    SimulationValue: dpPercent,
    TenorInMonths: tenor,
  };

  try {
    const res = await fetch(`${PROXY}/api/dsf/api/calculator/tenor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.status || !json.data) return null;
    const d = json.data;
    return {
      TotalRoundedDownPayment: d.TotalRoundedDownPayment,
      TotalRoundedInstallment: d.TotalRoundedInstallment,
      DownPaymentPercentage: d.DownPaymentPercentage,
      TotalLoan: d.TotalLoan,
    };
  } catch {
    return null;
  }
}
