import { useRoute } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Skeleton } from "../components/ui";
import { fetchHotDealDetail } from "../lib/cms";
import { useAsync } from "../lib/useAsync";

export function PromoDetail() {
  const [, params] = useRoute("/promo/:slug");
  const slug = params?.slug ?? "";

  const { data, loading, error } = useAsync(
    () => fetchHotDealDetail(slug),
    [slug],
  );

  return (
    <AppShell>
      <AppBar
        title={loading ? "Memuat…" : (data?.judul ?? "Detail Promo")}
        back="/promo"
      />

      <main className="pb-[60px]">
        {loading && (
          <div className="flex flex-col gap-4 p-3.5">
            <Skeleton className="aspect-[16/9] w-full rounded-[18px]" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {!loading && error && (
          <div className="m-3.5 rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
            Gagal memuat detail promo. Coba lagi nanti.
          </div>
        )}

        {!loading && !error && !data && (
          <div className="m-3.5 rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
            Promo tidak ditemukan.
          </div>
        )}

        {!loading && data && (
          <>
            {data.thumbnail && (
              <div className="overflow-hidden bg-surface-2">
                <img
                  src={data.thumbnail}
                  alt={data.judul}
                  loading="lazy"
                  className="w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="p-[18px]">
              <h1 className="m-0 mb-2 -tracking-[0.01em] text-[22px] font-extrabold leading-[1.2] text-ink">
                {data.judul}
              </h1>

              {data.deskripsi && (
                <p className="m-0 mb-4 text-[14px] leading-[1.6] text-muted">
                  {data.deskripsi}
                </p>
              )}

              {data.konten && (
                <div
                  className="prose-sm prose-neutral max-w-none text-[14px] leading-[1.7] text-ink [&_h2]:mt-6 [&_h2]:text-[17px] [&_h2]:font-bold [&_img]:w-full [&_img]:rounded-[14px] [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: data.konten }}
                />
              )}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
