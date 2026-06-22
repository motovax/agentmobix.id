import { Link } from "wouter";
import type { CardUnit } from "../lib/mobix";
import { formatJt, formatKm } from "../lib/format";
import { Photo, ThumbBadge } from "./ui";

/** Catalog list row — whole row links to the unit detail. */
export function UnitRow({ unit }: { unit: CardUnit }) {
  return (
    <Link
      href={`/unit/${unit.slug}`}
      className="flex gap-3 rounded-2xl border border-line bg-surface p-2.5 text-inherit no-underline"
    >
      <Photo
        className="aspect-[4/3] w-[118px] flex-shrink-0 rounded-xl"
        src={unit.thumbnail}
        alt={unit.title}
      >
        <ThumbBadge kind={unit.badge} />
      </Photo>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted">Cabang {unit.branch}</div>
        <div className="mt-px text-[14px] font-bold leading-[1.25]">{unit.title}</div>
        <div className="mt-1 flex items-baseline gap-[5px]">
          <div className="-tracking-[0.01em] text-[16px] font-extrabold">
            Rp {formatJt(unit.price)}
          </div>
          {unit.oldPrice && (
            <div className="text-[11px] font-semibold text-danger line-through">
              {formatJt(unit.oldPrice)}
            </div>
          )}
        </div>
        <div className="mt-px text-[11px] text-muted">
          TDP {formatJt(unit.tdp)} · {formatJt(unit.cicilan)}/bln · {formatKm(unit.km)}
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-[7px] bg-teal-tint px-2 py-[3px] text-[11px] font-bold text-teal-deep">
          Komisi Rp {formatJt(unit.komisi)}
        </div>
      </div>
    </Link>
  );
}
