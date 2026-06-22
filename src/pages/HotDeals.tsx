import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Photo, ThumbBadge, SkeletonRow } from "../components/ui";
import { fetchUnits, toCardUnit, type CardUnit } from "../lib/mobix";
import { useAsync } from "../lib/useAsync";
import { formatJt, formatKm } from "../lib/format";

const EXTRA = 1_000_000; // program promo: +Rp 1 juta komisi tiap closing

export function HotDeals() {
  // The catalog API has no discount/price-drop data, so "hot deals" here are
  // real ready units presented with the program's extra-commission promo.
  const { data, loading, error } = useAsync(
    () => fetchUnits({ limit: 10 }).then((r) => r.items.map(toCardUnit)),
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
            <div className="text-[12px] font-bold tracking-[0.04em] opacity-90">
              PEKAN INI
            </div>
            <div className="mt-1 text-[22px] font-extrabold leading-[1.15]">
              Komisi ekstra{" "}
              <span className="font-serif font-medium italic">+Rp 1 juta</span> tiap
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
          (data ?? []).map((u: CardUnit) => (
            <Link
              key={u.id}
              href={`/unit/${u.slug}`}
              className="flex gap-3 rounded-2xl border border-line bg-surface p-2.5 text-inherit no-underline"
            >
              <Photo
                className="aspect-[4/3] w-[120px] flex-shrink-0 rounded-xl"
                src={u.thumbnail}
                alt={u.title}
              >
                <ThumbBadge kind={u.badge} />
              </Photo>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted">Cabang {u.branch}</div>
                <div className="mt-px text-[14px] font-bold leading-[1.25]">
                  {u.title}
                </div>
                <div className="mt-1 text-[16px] font-extrabold">Rp {formatJt(u.price)}</div>
                <div className="mt-px text-[11px] text-muted">
                  TDP {formatJt(u.tdp)} · {formatJt(u.cicilan)}/bln · {formatKm(u.km)}
                </div>
                <div className="mt-1.5 inline-flex gap-1 rounded-[7px] bg-danger-bg px-2 py-[3px] text-[11px] font-bold text-danger">
                  Komisi {formatJt(u.komisi)} +{formatJt(EXTRA)}
                </div>
              </div>
            </Link>
          ))}

        <div className="h-5" />
      </main>
    </AppShell>
  );
}
