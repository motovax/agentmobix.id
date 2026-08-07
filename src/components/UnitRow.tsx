import { Link } from "wouter";
import {
  compactFinancingLabel,
  financingValueLabel,
  hasAvailableFinancing,
  requiresSalesContact,
  type CardUnit,
} from "../lib/mobix";
import { formatJt, formatKm } from "../lib/format";
import { Photo, ThumbBadge } from "./ui";

/** Catalog list row — whole row opens the photo/caption composer by default. */
export function UnitRow({
  unit,
  detailHref,
}: {
  unit: CardUnit;
  detailHref?: string;
}) {
  const financingAvailable = hasAvailableFinancing(unit.pembiayaan);
  const salesContactRequired = requiresSalesContact(unit.pembiayaan);
  return (
    <Link
      href={detailHref ?? `/share?u=${encodeURIComponent(unit.slug)}`}
      className="flex gap-3 rounded-2xl border border-line bg-surface p-2.5 text-inherit no-underline"
    >
      <Photo
        className="aspect-[4/3] w-[118px] flex-shrink-0 rounded-xl"
        src={unit.thumbnail}
        alt={unit.title}
        emptyLabel="Foto belum tersedia"
      >
        <ThumbBadge kind={unit.badge} />
      </Photo>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <span>Cabang {unit.branch}</span>
          {unit.plateNo && (
            <>
              <span className="h-[3px] w-[3px] rounded-full bg-muted/50" />
              <span className="font-medium text-ink">{unit.plateNo}</span>
            </>
          )}
        </div>
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
        <div
          className={`mt-px text-[11px] leading-[1.45] ${
            financingAvailable ? "text-muted" : "font-semibold text-[#9A5A00]"
          }`}
        >
          {salesContactRequired ? (
            <>
              <div>
                Harga kredit {financingValueLabel(unit.pembiayaan, "")}
              </div>
              <div>
                TDP {financingValueLabel(unit.pembiayaan, formatJt(unit.tdp))} · Cicilan{" "}
                {financingValueLabel(unit.pembiayaan, `${formatJt(unit.cicilan)}/bln`)} ·{" "}
                {formatKm(unit.km)}
              </div>
            </>
          ) : financingAvailable ? (
            `TDP ${formatJt(unit.tdp)} · ${formatJt(unit.cicilan)}/bln · ${formatKm(unit.km)}`
          ) : (
            `${compactFinancingLabel(unit.pembiayaan)} · ${formatKm(unit.km)}`
          )}
        </div>
        <div className="mt-1.5">
          <div className="text-[10px] text-muted">Komisi</div>
          <div className="text-[12px] font-bold text-teal-deep">{unit.komisiLabel}</div>
        </div>
      </div>
    </Link>
  );
}
