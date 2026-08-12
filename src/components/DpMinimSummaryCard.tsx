import { formatRupiah } from "../lib/format";
import type { DpMinimPackage } from "../lib/dsf";

type DpMinimSummaryCardProps = {
  packageData: DpMinimPackage | null;
  loading?: boolean;
};

export function DpMinimSummaryCard({
  packageData,
  loading = false,
}: DpMinimSummaryCardProps) {
  return (
    <section
      aria-labelledby="dp-minim-summary-title"
      aria-live="polite"
      className="mb-[18px] overflow-hidden rounded-[18px] border border-teal-tint-border bg-gradient-to-br from-teal-tint via-surface to-surface"
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <div className="mb-1 inline-flex rounded-full bg-teal px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink">
            DP Minim
          </div>
          <h2 id="dp-minim-summary-title" className="m-0 text-[16px] font-extrabold text-ink">
            Uang muka lebih ringan
          </h2>
        </div>
        <span className="shrink-0 rounded-lg border border-teal-tint-border bg-surface/80 px-2.5 py-1.5 text-[11px] font-bold text-teal-deep">
          {packageData ? `${packageData.tenor} bulan` : "Tenor 60 bulan"}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 divide-x divide-teal-tint-border border-t border-teal-tint-border bg-surface/55">
          {["TDP DP Minim", "Cicilan / bulan"].map((label) => (
            <div key={label} className="px-4 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </div>
              <div className="mt-2 h-5 w-24 animate-pulse rounded bg-line" />
            </div>
          ))}
          <span className="sr-only">Menghitung paket DP minimum...</span>
        </div>
      ) : packageData ? (
        <>
          <div className="grid grid-cols-2 divide-x divide-teal-tint-border border-y border-teal-tint-border bg-surface/55">
            <div className="min-w-0 px-4 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                TDP DP Minim
              </div>
              <div className="mt-1 truncate text-[16px] font-extrabold text-teal-deep">
                {formatRupiah(packageData.tdp)}
              </div>
              <div className="mt-0.5 truncate text-[10px] font-semibold text-muted">
                DP Minim Real {formatRupiah(packageData.dpReal)}
              </div>
            </div>
            <div className="min-w-0 px-4 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Cicilan / bulan
              </div>
              <div className="mt-1 truncate text-[16px] font-extrabold text-ink">
                {formatRupiah(packageData.cicilan)}
              </div>
            </div>
          </div>
          <p className="m-0 px-4 py-2.5 text-[10px] leading-relaxed text-muted">
            Estimasi paket DSF untuk harga aktif. Syarat dan ketentuan berlaku.
          </p>
        </>
      ) : (
        <div className="border-t border-teal-tint-border bg-surface/55 px-4 py-3.5">
          <div className="text-[12px] font-bold text-mid">Hitungan DP minimum belum tersedia.</div>
          <div className="mt-0.5 text-[10px] leading-relaxed text-muted">
            Buka Simulasi kredit di bawah untuk mencoba hitung ulang.
          </div>
        </div>
      )}
    </section>
  );
}
