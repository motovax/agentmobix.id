import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { UnitRow } from "../components/UnitRow";
import { SkeletonRow } from "../components/ui";
import { ChevronLeft, Search, Sliders } from "../components/icons";
import { fetchUnits, toCardUnit, type CardUnit } from "../lib/mobix";

const LIMIT = 12;

const CHIPS: { label: string; kategori?: string }[] = [
  { label: "Semua" },
  { label: "MPV", kategori: "mpv" },
  { label: "LCGC", kategori: "lcgc" },
  { label: "SUV", kategori: "suv" },
  { label: "Sedan", kategori: "sedan" },
  { label: "Hatchback", kategori: "hatchback" },
];

export function Katalog() {
  const [activeChip, setActiveChip] = useState("Semua");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const [items, setItems] = useState<CardUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // debounce the search box
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const kategori = CHIPS.find((c) => c.label === activeChip)?.kategori;

  // initial / filter-changed load (page 1)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchUnits({
      limit: LIMIT,
      page: 1,
      judul: debounced ? [debounced] : undefined,
      kategori: kategori ? [kategori] : undefined,
    })
      .then((res) => {
        if (!alive) return;
        setItems(res.items.map(toCardUnit));
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setPage(1);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Gagal memuat katalog");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, kategori]);

  function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    fetchUnits({
      limit: LIMIT,
      page: next,
      judul: debounced ? [debounced] : undefined,
      kategori: kategori ? [kategori] : undefined,
    })
      .then((res) => {
        setItems((prev) => {
          const seen = new Set(prev.map((u) => u.id));
          return [...prev, ...res.items.map(toCardUnit).filter((u) => !seen.has(u.id))];
        });
        setPage(next);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }

  const hasMore = page < totalPages && !error;

  return (
    <AppShell>
      {/* sticky app bar + search + chips */}
      <div className="sticky top-0 z-30 border-b border-line-2 bg-surface-2/90 px-3.5 pb-3 pt-1.5 backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2.5">
          <Link
            href="/"
            aria-label="Kembali"
            className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink no-underline"
          >
            <ChevronLeft />
          </Link>
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2.5">
            <Search className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari merek atau tipe…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-placeholder"
            />
            <Sliders className="text-muted" />
          </div>
        </div>
        <div className="scroll-x flex gap-1.5 overflow-x-auto">
          {CHIPS.map((c) => {
            const isActive = c.label === activeChip;
            return (
              <button
                key={c.label}
                onClick={() => setActiveChip(c.label)}
                className={`whitespace-nowrap rounded-full px-3 py-[7px] text-[12px] font-semibold ${
                  isActive
                    ? "bg-ink text-surface"
                    : "border border-line bg-surface text-mid"
                }`}
              >
                {c.label}
                {c.label === "Semua" && total ? ` · ${total}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[12px] text-muted">
            {total ? `${total} unit ready` : "Memuat stok…"} · langsung dari cabang
          </span>
          <span className="text-[12px] font-semibold text-teal-deep">Stok live</span>
        </div>

        {loading &&
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && error && (
          <div className="rounded-2xl border border-danger-border bg-danger-bg px-4 py-8 text-center">
            <div className="text-[13px] font-semibold text-danger">
              Gagal memuat katalog
            </div>
            <div className="mt-1 text-[12px] text-mid">{error}</div>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
            Tidak ada unit yang cocok dengan pencarianmu.
          </div>
        )}

        {!loading &&
          !error &&
          items.map((u) => <UnitRow key={u.id} unit={u} />)}

        {!loading && !error && items.length > 0 && (
          <>
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-1 rounded-[14px] border border-line bg-surface py-3.5 text-[14px] font-bold text-ink disabled:opacity-60"
              >
                {loadingMore ? "Memuat…" : "Muat lebih banyak"}
              </button>
            ) : (
              <div className="py-1 text-center text-[12px] text-muted">
                Menampilkan {items.length} dari {total} unit
              </div>
            )}
          </>
        )}

        <div className="h-5" />
      </main>
    </AppShell>
  );
}
