import { Link } from "wouter";
import type { CardUnit } from "../lib/mobix";
import { formatJt } from "../lib/format";
import { Photo, Badge } from "./ui";
import { Calculator, ShareArrow } from "./icons";

/**
 * Horizontal-scroller unit card (Beranda "siap kamu share"). Dual target: the
 * card body opens the detail; the Share button opens the share sheet without
 * also triggering card navigation.
 */
export function UnitCard({ unit }: { unit: CardUnit }) {
  const shareParams = new URLSearchParams({
    u: unit.slug,
    tenor: "60",
    tdp: String(Math.round(unit.tdp)),
    cicilan: String(Math.round(unit.cicilan)),
  });

  return (
    <article className="relative flex-[0_0_200px] snap-start overflow-hidden rounded-2xl border border-line bg-surface-3">
      {/* full-card overlay link → detail */}
      <Link
        href={`/unit/${unit.slug}`}
        aria-label={`Lihat detail ${unit.title}`}
        className="absolute inset-0 z-[1]"
      />
      <Photo className="aspect-[4/3]" src={unit.thumbnail} alt={unit.title}>
        <div className="absolute left-2 top-2">
          <Badge kind={unit.badge} />
        </div>
      </Photo>
      <div className="px-3 pb-3 pt-2.5">
        <div className="mt-0.5 line-clamp-1 text-[13px] font-bold leading-[1.3] text-ink">
          {unit.title}
        </div>
        <div className="mt-1.5 flex items-baseline gap-[5px]">
          <div className="-tracking-[0.01em] text-[15px] font-extrabold text-ink">
            Rp {formatJt(unit.price)}
          </div>
          {unit.oldPrice && (
            <div className="text-[11px] font-semibold text-danger line-through">
              {formatJt(unit.oldPrice)}
            </div>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          TDP {formatJt(unit.tdp)} · {formatJt(unit.cicilan)}/bln
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {unit.posisi !== unit.branch && (
            <span className="rounded-md bg-field px-1.5 py-0.5 text-[10px] font-medium text-muted">
              📍 Posisi: {unit.posisi}
            </span>
          )}
          <span className="rounded-md bg-field px-1.5 py-0.5 text-[10px] font-medium text-muted">
            🏢 Cabang: {unit.branch}
          </span>
        </div>
        <Link
          href={`/unit/${unit.slug}#simulasi-kredit`}
          aria-label={`Tanya hitungan ${unit.title}`}
          className="relative z-[2] mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-teal-tint-border bg-teal-tint px-2.5 py-2 text-[11px] font-bold text-teal-deep no-underline"
        >
          <Calculator size={13} />
          Tanya Hitungan
        </Link>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#EEF2F3] pt-2.5">
          <div>
            <div className="text-[10px] text-muted">Komisi</div>
            <div className="text-[12px] font-bold text-teal-deep">
              {unit.komisiLabel}
            </div>
          </div>
          <Link
            href={`/share?${shareParams.toString()}`}
            aria-label={`Share ${unit.title}`}
            className="relative z-[2] inline-flex items-center gap-1 rounded-[10px] bg-ink px-2.5 py-2 text-[11px] font-bold text-surface no-underline"
          >
            Share
            <ShareArrow size={10} />
          </Link>
        </div>
      </div>
    </article>
  );
}
