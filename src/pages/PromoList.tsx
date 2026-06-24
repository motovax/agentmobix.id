import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Skeleton } from "../components/ui";
import { fetchHotDeals, cmsImageUrl, type HotDeal } from "../lib/cms";
import { useAsync } from "../lib/useAsync";

const CHUNK = 8;

function PromoCard({ item }: { item: HotDeal }) {
  const imgSrc = cmsImageUrl(item.thumbnail, "thumb");
  return (
    <Link
      href={`/promo/${item.slug}`}
      className="flex items-start gap-3.5 rounded-[18px] border border-line bg-surface p-3 text-inherit no-underline"
    >
      <div className="relative h-20 w-[104px] flex-shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-teal-soft to-[#5AA8A6]">
        {imgSrc && (
          <img
            src={imgSrc}
            alt={item.judul}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="text-[14px] font-semibold leading-[1.35] text-ink line-clamp-3">
          {item.judul}
        </div>
        {item.deskripsi && (
          <div className="mt-1 text-[11px] leading-[1.4] text-muted line-clamp-2">
            {item.deskripsi}
          </div>
        )}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-3">
      <Skeleton className="h-20 w-[104px] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    </div>
  );
}

export function PromoList() {
  const { data, loading, error } = useAsync(() => fetchHotDeals(), []);
  const [visible, setVisible] = useState(CHUNK);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible((v) => v + CHUNK);
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const items = data ?? [];
  const shown = items.slice(0, visible);
  const hasMore = visible < items.length;

  return (
    <AppShell>
      <AppBar title="Penawaran & Promo" back="/" />

      <main className="flex flex-col gap-3 p-3.5 pb-[60px]">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && error && (
          <div className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
            Gagal memuat promo. Coba lagi nanti.
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
            Belum ada promo tersedia.
          </div>
        )}

        {shown.map((item) => (
          <PromoCard key={item.slug} item={item} />
        ))}

        {hasMore && <div ref={sentinelRef} className="py-1" />}
      </main>
    </AppShell>
  );
}
