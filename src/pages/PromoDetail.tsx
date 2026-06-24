import { useRoute } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { Skeleton } from "../components/ui";
import { fetchHotDealDetail, cmsImageUrl } from "../lib/cms";
import { useAsync } from "../lib/useAsync";

const htmlCls =
  "text-[14px] leading-[1.7] text-ink [&_p]:mt-3 [&_p:first-child]:mt-0 [&_ul]:mt-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mt-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mt-1 [&_strong]:font-semibold [&_a]:text-teal-deep [&_a]:underline";

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
            {cmsImageUrl(data.thumbnail, "full") && (
              <div className="overflow-hidden bg-surface-2">
                <img
                  src={cmsImageUrl(data.thumbnail, "full")}
                  alt={data.judul}
                  loading="lazy"
                  className="w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="flex flex-col gap-4 p-[18px]">
              <h1 className="m-0 -tracking-[0.01em] text-[22px] font-extrabold leading-[1.2] text-ink">
                {data.judul}
              </h1>

              {/* Periode */}
              {data.toggle_periode && (data.periode_by_text || data.periode_by_date) && (
                <div className="flex items-center gap-2 rounded-[14px] bg-teal-tint px-3.5 py-2.5">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="flex-shrink-0 text-teal-deep">
                    <rect x="1" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 1v3M10 1v3M1 6h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] font-medium text-teal-deep">
                    {data.periode_by_text ?? data.periode_by_date}
                  </span>
                </div>
              )}

              {/* Deskripsi — HTML dari Strapi */}
              {data.deskripsi && (
                <div
                  className={htmlCls}
                  dangerouslySetInnerHTML={{ __html: data.deskripsi }}
                />
              )}

              {/* Syarat & Ketentuan */}
              {data.syarat_ketentuan && (
                <div className="rounded-[18px] border border-line bg-surface-2 p-[18px]">
                  <div className="mb-2.5 text-[13px] font-bold text-ink">Syarat & Ketentuan</div>
                  <div
                    className={htmlCls}
                    dangerouslySetInnerHTML={{ __html: data.syarat_ketentuan }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
