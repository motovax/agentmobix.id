import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { BottomNav } from "../components/BottomNav";
import { FloatingContactCta } from "../components/FloatingContactCta";
import { SkeletonRow } from "../components/ui";
import { UnitRow } from "../components/UnitRow";
import { fetchUnits, toCardUnit, type CardUnit } from "../lib/mobix";
import { useAsync } from "../lib/useAsync";

export function HotDeals() {
  // The catalog API has no discount/price-drop data, so "hot deals" here are
  // real ready units presented with the program's extra-commission promo.
  const { data, loading, error } = useAsync(
    () => fetchUnits({ limit: 10, aging_awal: 61 }).then((r) => r.items.map(toCardUnit)),
    [],
  );

  return (
    <AppShell>
      <AppBar title="Hot Deals" subtitle="Unit pilihan & komisi ekstra" />

      <main className="flex flex-col gap-3 p-3.5">
        {/* banner */}
        <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-danger to-[#E2622E] p-[18px] text-surface">
          <div className="absolute -right-5 -top-10 h-[150px] w-[150px] rounded-full bg-white/[0.12]" />
          <div className="relative">
            <div className="mt-1 text-[22px] font-extrabold leading-[1.15]">
              Komisi ekstra{" "}
              <span className="font-serif font-medium italic">+Rp 2 juta</span> tiap
              closing unit hot deal.
            </div>
          </div>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && error && (
          <div className="rounded-2xl border border-danger-border bg-danger-bg px-4 py-8 text-center text-[13px] font-semibold text-danger">
            Gagal memuat hot deals.
          </div>
        )}

        {!loading &&
          !error &&
          (data ?? []).map((u: CardUnit) => <UnitRow key={u.id} unit={u} />)}

        {/* Reserve room for the floating CTA and bottom navigation. */}
        <div className="h-[160px]" />
      </main>

      <FloatingContactCta bottomClassName="bottom-[calc(112px+env(safe-area-inset-bottom))]" />
      <BottomNav active="hot" />
    </AppShell>
  );
}
