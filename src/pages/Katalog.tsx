import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { UnitRow } from "../components/UnitRow";
import { SkeletonRow } from "../components/ui";
import { ChevronLeft, Search, Sliders } from "../components/icons";
import {
  fetchUnits,
  fetchCategories,
  prettyCategory,
  toCardUnit,
  classifyQuery,
  type CardUnit,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";

const LIMIT = 12;

export function Katalog() {
  // "" = Semua; otherwise a live category code from /daftar-kategori
  const [activeCat, setActiveCat] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const categories = useAsync(fetchCategories, []);

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

  const kategori = activeCat || undefined;
  const classification = debounced ? classifyQuery(debounced) : null;

  function buildSearchParams() {
    if (!classification) return {};
    return {
      judul:       classification.param === "judul"       ? classification.value : undefined,
      merek:       classification.param === "merek"       ? classification.value : undefined,
      bahan_bakar: classification.param === "bahan_bakar" ? classification.value : undefined,
      transmisi:   classification.param === "transmisi"   ? classification.value : undefined,
      plate_no:    classification.param === "plate_no"    ? classification.value : undefined,
    };
  }

  // initial / filter-changed load (page 1)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchUnits({
      limit: LIMIT,
      page: 1,
      ...buildSearchParams(),
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
      ...buildSearchParams(),
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
      {/* fixed header: search + chips + stats */}
      <div className="fixed left-1/2 top-0 z-[9999] w-full max-w-[412px] -translate-x-1/2 border-b border-line-2 bg-surface-2/90 px-3.5 pb-2 pt-1.5 backdrop-blur-md">
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
              placeholder="Cari merek, tipe, atau nopol…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-placeholder"
            />
            <Sliders className="text-muted" />
          </div>
        </div>
        <div className="scroll-x flex gap-1.5 overflow-x-auto">
          {[{ value: "", label: "Semua" }, ...(categories.data ?? []).map((c) => ({ value: c, label: prettyCategory(c) }))].map((c) => {
            const isActive = c.value === activeCat;
            return (
              <button
                key={c.value || "all"}
                onClick={() => setActiveCat(c.value)}
                className={`whitespace-nowrap rounded-full px-3 py-[7px] text-[12px] font-semibold ${
                  isActive
                    ? "bg-ink text-surface"
                    : "border border-line bg-surface text-mid"
                }`}
              >
                {c.label}
                {isActive && !loading && total > 0 ? ` · ${total}` : ""}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between px-0.5">
          <span className="text-[12px] text-muted">
            {loading ? "Memuat stok…" : `${total} unit ready · langsung dari cabang`}
          </span>
          <span className="text-[12px] font-semibold text-teal-deep">Stok live</span>
        </div>
      </div>
      <div className="h-[130px]" aria-hidden />

      <main className="flex flex-col gap-2.5 p-3.5">

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
