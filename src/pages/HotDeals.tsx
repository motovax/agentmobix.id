import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Photo } from "../components/ui";
import { HOT_DEALS } from "../data/catalog";
import { formatJt } from "../lib/format";

export function HotDeals() {
  return (
    <AppShell>
      <AppBar title="Hot Deals" subtitle="Unit turun harga & komisi ekstra" />

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

        {HOT_DEALS.map((d) => (
          <Link
            key={d.slug}
            href={`/unit/${d.slug}`}
            className="flex gap-3 rounded-2xl border border-line bg-surface p-2.5 text-inherit no-underline"
          >
            <Photo className="aspect-[4/3] w-[120px] flex-shrink-0 rounded-xl">
              <span className="absolute left-1.5 top-1.5 rounded-[7px] bg-danger px-[7px] py-0.5 text-[9px] font-bold text-surface">
                {d.discountLabel}
              </span>
            </Photo>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted">Cabang {d.branch}</div>
              <div className="mt-px text-[14px] font-bold leading-[1.25]">{d.title}</div>
              <div className="mt-1 flex items-baseline gap-[5px]">
                <div className="text-[16px] font-extrabold">Rp {formatJt(d.price)}</div>
                <div className="text-[11px] font-semibold text-danger line-through">
                  {formatJt(d.oldPrice)}
                </div>
              </div>
              <div className="mt-1.5 inline-flex gap-1 rounded-[7px] bg-danger-bg px-2 py-[3px] text-[11px] font-bold text-danger">
                Komisi {formatJt(d.komisi)} +{formatJt(d.komisiExtra)}
              </div>
            </div>
          </Link>
        ))}

        <div className="h-5" />
      </main>
    </AppShell>
  );
}
