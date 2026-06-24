import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { MapPin } from "../components/icons";
import { fetchCabang, type CabangDetail } from "../lib/mobix";
import { useAsync } from "../lib/useAsync";

export function Lokasi() {
  const { data, loading, error } = useAsync(fetchCabang, []);
  const cabang = data ?? [];

  return (
    <AppShell>
      <AppBar
        title="Cabang Mobix"
        subtitle={
          loading ? "Memuat cabang…" : `${cabang.length} cabang · stok bisa lintas cabang`
        }
      />

      {/* faux map — replace with a real map SDK in production */}
      <div className="relative h-[170px] overflow-hidden bg-gradient-to-br from-[#DCE7E6] to-[#C7D8D7]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute left-[30%] top-[40%] -translate-x-1/2 -translate-y-full">
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
            <path d="M11 21s-6-5-6-10a6 6 0 1 1 12 0c0 5-6 10-6 10z" fill="#0E1B1E" />
            <circle cx="11" cy="9" r="2.4" fill="#1ECFCB" />
          </svg>
        </div>
        <div className="absolute left-[62%] top-[58%] -translate-x-1/2 -translate-y-full">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 21s-6-5-6-10a6 6 0 1 1 12 0c0 5-6 10-6 10z" fill="#0FA8A4" />
            <circle cx="11" cy="9" r="2.2" fill="#FFFFFF" />
          </svg>
        </div>
      </div>

      <main className="flex flex-col gap-2.5 p-3.5">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[90px] animate-pulse rounded-2xl bg-line" />
          ))}

        {!loading && error && (
          <div className="rounded-2xl border border-danger-border bg-danger-bg px-4 py-8 text-center text-[13px] font-semibold text-danger">
            Gagal memuat data cabang.
          </div>
        )}

        {!loading &&
          !error &&
          cabang.map((b: CabangDetail) => (
            <div
              key={b.nama}
              className="flex gap-3 rounded-2xl border border-line bg-surface p-3.5"
            >
              <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-teal-tint text-teal-deep">
                <MapPin />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="text-[14px] font-bold">{b.nama}</div>
                  {b.stok_ready > 0 && (
                    <span className="rounded-md bg-teal-tint px-1.5 py-0.5 text-[10px] font-bold text-teal-deep">
                      {b.stok_ready} unit
                    </span>
                  )}
                </div>
                <div className="mt-[3px] text-[12px] leading-[1.45] text-muted">
                  {b.alamat}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-teal-deep">
                  {b.telepon && (
                    <a href={`tel:${b.telepon}`} className="no-underline text-teal-deep">
                      {b.telepon}
                    </a>
                  )}
                  {b.pic && (
                    <>
                      {b.telepon && <span className="text-muted">·</span>}
                      <span>PIC {b.pic}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

        <div className="h-5" />
      </main>
    </AppShell>
  );
}
