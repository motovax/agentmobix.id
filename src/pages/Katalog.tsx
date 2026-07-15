import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { AppShell } from "../components/AppShell";
import { FloatingContactCta } from "../components/FloatingContactCta";
import { UnitRow } from "../components/UnitRow";
import { SkeletonRow } from "../components/ui";
import { ChevronLeft, Close, Search, Sliders } from "../components/icons";
import {
  fetchUnits,
  fetchCategories,
  fetchCabang,
  prettyCategory,
  titleCase,
  toCardUnit,
  classifyQuery,
  type CardUnit,
} from "../lib/mobix";
import { useAsync } from "../lib/useAsync";

const LIMIT = 12;

const PRICE_RANGES = [
  { label: "< Rp100jt", min: undefined, max: 100_000_000 },
  { label: "Rp100–150jt", min: 100_000_000, max: 150_000_000 },
  { label: "Rp150–200jt", min: 150_000_000, max: 200_000_000 },
  { label: "Rp200–300jt", min: 200_000_000, max: 300_000_000 },
  { label: "> Rp300jt", min: 300_000_000, max: undefined },
] as const;

const TRANSMISI_OPTIONS = [
  { label: "Manual", value: "MANUAL" },
  { label: "Matic", value: "AUTOMATIC" },
] as const;

interface Filters {
  priceMin?: number;
  priceMax?: number;
  transmisi?: string;
  lokasi?: string;
}

function countActiveFilters(f: Filters): number {
  return (
    (f.priceMin !== undefined || f.priceMax !== undefined ? 1 : 0) +
    (f.transmisi ? 1 : 0) +
    (f.lokasi ? 1 : 0)
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-2.5 text-[13px] font-semibold ${
        active
          ? "border border-teal-tint-border bg-teal-tint text-teal-deep"
          : "border border-line bg-surface text-mid"
      }`}
    >
      {label}
    </button>
  );
}

function FilterSheet({
  initial,
  branches,
  onApply,
  onClose,
}: {
  initial: Filters;
  branches: string[];
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(initial);

  // lock page scroll while the sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const priceActive = (r: (typeof PRICE_RANGES)[number]) =>
    draft.priceMin === r.min && draft.priceMax === r.max;

  return (
    <div className="fixed inset-0 z-[10000]">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute bottom-0 left-1/2 flex max-h-[82dvh] w-full max-w-[412px] -translate-x-1/2 flex-col rounded-t-[26px] bg-surface">
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="m-0 text-[17px] font-extrabold text-ink">Filter</h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink"
          >
            <Close />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <div className="mb-2 text-[13px] font-bold text-ink">Rentang harga</div>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((r) => (
              <FilterChip
                key={r.label}
                label={r.label}
                active={priceActive(r)}
                onClick={() =>
                  setDraft((d) =>
                    priceActive(r)
                      ? { ...d, priceMin: undefined, priceMax: undefined }
                      : { ...d, priceMin: r.min, priceMax: r.max },
                  )
                }
              />
            ))}
          </div>

          <div className="mb-2 mt-5 text-[13px] font-bold text-ink">Transmisi</div>
          <div className="flex flex-wrap gap-2">
            {TRANSMISI_OPTIONS.map((t) => (
              <FilterChip
                key={t.value}
                label={t.label}
                active={draft.transmisi === t.value}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    transmisi: d.transmisi === t.value ? undefined : t.value,
                  }))
                }
              />
            ))}
          </div>

          {branches.length > 0 && (
            <>
              <div className="mb-2 mt-5 text-[13px] font-bold text-ink">Cabang</div>
              <div className="flex flex-wrap gap-2 pb-2">
                {branches.map((b) => (
                  <FilterChip
                    key={b}
                    label={titleCase(b)}
                    active={draft.lokasi === b}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        lokasi: d.lokasi === b ? undefined : b,
                      }))
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-line px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3.5">
          <button
            onClick={() => setDraft({})}
            className="flex-1 rounded-2xl border border-line bg-surface py-3.5 text-[14px] font-bold text-ink"
          >
            Reset
          </button>
          <button
            onClick={() => onApply(draft)}
            className="flex-[2] rounded-2xl bg-ink py-3.5 text-[14px] font-bold text-surface"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}

function catalogErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/cannot scan NULL|can't scan into dest/i.test(message)) {
    return "Kategori ini belum bisa dimuat karena ada data produk yang belum lengkap di API Mobix.";
  }
  if (/Mobix API 5\d\d/i.test(message)) {
    return "Mobix API sedang bermasalah. Coba lagi beberapa saat.";
  }
  return message || "Gagal memuat katalog";
}

export function Katalog() {
  // One-shot filters handed in from a homepage shortcut (chip/search tap),
  // e.g. /katalog?kategori=MPV&q=Toyota&harga_max=150000000&focus=1
  const initialSearch = useSearch();
  const [activeCat, setActiveCat] = useState(
    () => new URLSearchParams(initialSearch).get("kategori") ?? "",
  );
  const [query, setQuery] = useState(
    () => new URLSearchParams(initialSearch).get("q") ?? "",
  );
  const [debounced, setDebounced] = useState(
    () => new URLSearchParams(initialSearch).get("q") ?? "",
  );
  const [filters, setFilters] = useState<Filters>(() => {
    const p = new URLSearchParams(initialSearch);
    const min = Number(p.get("harga_min"));
    const max = Number(p.get("harga_max"));
    return {
      priceMin: min > 0 ? min : undefined,
      priceMax: max > 0 ? max : undefined,
      transmisi: p.get("transmisi") || undefined,
      lokasi: p.get("lokasi") || undefined,
    };
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autoFocus] = useState(
    () => new URLSearchParams(initialSearch).get("focus") === "1",
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cabang = useAsync(fetchCabang, []);

  useEffect(() => {
    if (autoFocus) searchInputRef.current?.focus();
  }, [autoFocus]);

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
    const fromQuery = classification ? {
      judul:       classification.param === "judul"       ? classification.value : undefined,
      merek:       classification.param === "merek"       ? classification.value : undefined,
      bahan_bakar: classification.param === "bahan_bakar" ? classification.value : undefined,
      transmisi:   classification.param === "transmisi"   ? classification.value : undefined,
      plate_no:    classification.param === "plate_no"    ? classification.value : undefined,
    } : {};
    return {
      ...fromQuery,
      transmisi: fromQuery.transmisi ?? (filters.transmisi ? [filters.transmisi] : undefined),
      lokasi: filters.lokasi ? [filters.lokasi] : undefined,
      harga_awal: filters.priceMin,
      harga_akhir: filters.priceMax,
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
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setPage(1);
        setError(catalogErrorMessage(e));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, kategori, filters]);

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
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari merek, tipe, atau nopol…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-placeholder"
            />
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Buka filter"
              className="relative -m-2 flex-shrink-0 p-2"
            >
              <Sliders className={countActiveFilters(filters) > 0 ? "text-teal-deep" : "text-muted"} />
              {countActiveFilters(filters) > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-deep px-1 text-[9px] font-bold text-surface">
                  {countActiveFilters(filters)}
                </span>
              )}
            </button>
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

        <div className="h-[96px]" />
      </main>

      <FloatingContactCta />

      {sheetOpen && (
        <FilterSheet
          initial={filters}
          branches={(cabang.data ?? []).map((c) => c.nama)}
          onApply={(f) => {
            setFilters(f);
            setSheetOpen(false);
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </AppShell>
  );
}
