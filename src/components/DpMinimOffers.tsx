import type { DpMinimOffer } from "../lib/dsf";
import { formatRupiah } from "../lib/format";

export function DpMinimOffers({ offers, notes }: { offers: DpMinimOffer[]; notes: string[] }) {
  return (
    <div className="space-y-3" data-dp-minim-offers>
      <ol className="m-0 list-none divide-y divide-line rounded-xl border border-line bg-surface px-3.5">
        {offers.map((offer, index) => (
          <li key={offer.leasing} className="min-w-0 py-3.5">
            <div className="mb-2 text-[13px] font-extrabold text-ink">{index + 1}. {offer.leasing}</div>
            <dl className="m-0 space-y-1.5 text-[12px]">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <dt className="font-semibold text-mid">DP Minim</dt>
                <dd className="m-0 font-extrabold text-teal-deep">{offer.available && offer.minimum_dp !== null ? formatRupiah(offer.minimum_dp) : "Tidak tersedia"}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <dt className="font-semibold text-mid">Angsuran</dt>
                <dd className="m-0 font-bold text-ink">{offer.available && offer.installment !== null ? `${formatRupiah(offer.installment)}/bulan` : "Tidak tersedia"}</dd>
              </div>
            </dl>
            {!offer.available && <p className="mb-0 mt-2 text-[11px] leading-relaxed text-muted">{offer.reason}</p>}
            {offer.condition && <p className="mb-0 mt-2 text-[11px] leading-relaxed text-muted">Syarat: {offer.condition}</p>}
          </li>
        ))}
      </ol>
      <div className="space-y-1 text-[11px] leading-relaxed text-muted">
        {notes.map((note) => <p key={note} className="m-0">{note}</p>)}
      </div>
    </div>
  );
}
