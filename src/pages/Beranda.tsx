import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { FloatingContactCta } from "../components/FloatingContactCta";
import { UnitRow } from "../components/UnitRow";
import { Search } from "../components/icons";
import { Photo, Skeleton, SkeletonRow } from "../components/ui";
import {
  fetchUnits,
  fetchCategories,
  prettyCategory,
  compactFinancingLabel,
  hasAvailableFinancing,
  toCardUnit,
  type CardUnit,
} from "../lib/mobix";
import { buildCatalogSearchParams } from "../lib/catalogSearch";
import { formatJt, formatKm } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";

const BUDGET_CHIPS = [
  { label: "< Rp100jt", href: "/katalog?harga_max=100000000" },
  { label: "Rp100–150jt", href: "/katalog?harga_min=100000000&harga_max=150000000" },
  { label: "Rp150–200jt", href: "/katalog?harga_min=150000000&harga_max=200000000" },
  { label: "> Rp200jt", href: "/katalog?harga_min=200000000" },
  { label: "Matic", href: "/katalog?transmisi=AUTOMATIC" },
];

const BRANDS = [
  { label: "Toyota", logo: "/brands/toyota.png" },
  { label: "Honda", logo: "/brands/honda.png" },
  { label: "Daihatsu", logo: "/brands/daihatsu.png" },
  { label: "Suzuki", logo: "/brands/suzuki.png" },
  { label: "Mitsubishi", logo: "/brands/mitsubishi.png" },
  { label: "Nissan", logo: "/brands/nissan.png" },
  { label: "Hyundai", logo: "/brands/hyundai.png" },
  { label: "Lainnya", logo: null },
];

const REC_BATCH_SIZE = 6;
const SEARCH_BATCH_SIZE = 12;

function appendUniqueUnits(current: CardUnit[], next: CardUnit[]) {
  const seen = new Set(current.map((unit) => unit.id));
  const unique = next.filter((unit) => {
    if (seen.has(unit.id)) return false;
    seen.add(unit.id);
    return true;
  });
  return [...current, ...unique];
}

function RecCard({ unit }: { unit: CardUnit }) {
  const financingAvailable = hasAvailableFinancing(unit.pembiayaan);
  return (
    <Link
      href={`/unit/${unit.slug}`}
      className="block overflow-hidden rounded-[18px] border border-line bg-surface text-inherit no-underline"
    >
      <Photo
        className="h-[104px]"
        src={unit.thumbnail}
        alt={unit.title}
        emptyLabel="Foto belum tersedia"
      >
        <span className="absolute right-2 top-2 rounded-full bg-ink/75 px-2 py-1 text-[10px] font-bold text-surface">
          {unit.year}
        </span>
      </Photo>
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="mb-1 line-clamp-2 text-[12.5px] font-bold leading-[1.25] text-ink">
          {unit.title}
        </div>
        <div className="-tracking-[0.01em] text-[14px] font-extrabold text-teal-deep">
          Rp {formatJt(unit.price)}
        </div>
        <div
          className={`mt-0.5 text-[10px] ${
            financingAvailable ? "text-muted" : "font-semibold text-[#9A5A00]"
          }`}
        >
          {financingAvailable
            ? `TDP ${formatJt(unit.tdp)}`
            : compactFinancingLabel(unit.pembiayaan)}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-field px-1.5 py-1 text-[10px] font-semibold text-muted">
            {formatKm(unit.km)}
          </span>
          <span className="rounded-lg bg-field px-1.5 py-1 text-[10px] font-semibold text-muted">
            {unit.transmisi}
          </span>
        </div>
        <div className="mt-2 inline-block rounded-[10px] border border-teal-tint-border bg-teal-tint px-2 py-1 text-[10px] font-extrabold text-teal-deep">
          Komisi {unit.komisiLabel}
        </div>
      </div>
    </Link>
  );
}

function RecSkeleton() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
      <Skeleton className="h-[104px] rounded-none" />
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    </div>
  );
}

export function Beranda() {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [recItems, setRecItems] = useState<CardUnit[]>([]);
  const [recTotal, setRecTotal] = useState(0);
  const [recNextPage, setRecNextPage] = useState(1);
  const [recTotalPages, setRecTotalPages] = useState<number | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(false);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const recLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchResultsRef = useRef<HTMLElement | null>(null);
  const recLoadingRef = useRef(false);
  const recRequestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      400,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const categories = useAsync(fetchCategories, []);
  const isSearchActive = debouncedQuery.length > 0;
  const currentRequestKey = `${debouncedQuery}\u0000${activeCategory ?? ""}`;
  const searchIsPending =
    query.trim() !== debouncedQuery ||
    (isSearchActive &&
      (recLoading || loadedRequestKey !== currentRequestKey));
  const hasMoreRecommendations =
    recTotalPages === null || recNextPage <= recTotalPages;

  const loadRecommendations = useCallback(async (options?: {
    page?: number;
    replace?: boolean;
  }) => {
    const page = options?.page ?? recNextPage;
    const replace = options?.replace ?? false;
    if (recLoadingRef.current && !replace) return;
    if (!replace && recTotalPages !== null && page > recTotalPages) return;

    recLoadingRef.current = true;
    const requestId = ++recRequestRef.current;
    setRecLoading(true);
    setRecError(false);
    if (replace) {
      setRecItems([]);
      setRecTotal(0);
      setRecNextPage(1);
      setRecTotalPages(null);
    }

    try {
      const result = await fetchUnits({
        page,
        limit: isSearchActive ? SEARCH_BATCH_SIZE : REC_BATCH_SIZE,
        ...buildCatalogSearchParams(debouncedQuery),
        kategori: activeCategory ? [activeCategory] : undefined,
      });
      if (requestId !== recRequestRef.current) return;
      const nextItems = result.items.map(toCardUnit);
      setRecItems((current) =>
        replace ? nextItems : appendUniqueUnits(current, nextItems),
      );
      setRecTotal(result.total);
      setRecTotalPages(result.totalPages);
      setRecNextPage(page + 1);
      setLoadedRequestKey(currentRequestKey);
    } catch {
      if (requestId !== recRequestRef.current) return;
      setRecError(true);
      setLoadedRequestKey(currentRequestKey);
    } finally {
      if (requestId === recRequestRef.current) {
        recLoadingRef.current = false;
        setRecLoading(false);
      }
    }
  }, [
    activeCategory,
    currentRequestKey,
    debouncedQuery,
    isSearchActive,
    recNextPage,
    recTotalPages,
  ]);

  useEffect(() => {
    loadRecommendations({ page: 1, replace: true });
  }, [activeCategory, debouncedQuery]);

  useEffect(() => {
    const target = recLoadMoreRef.current;
    if (
      isSearchActive ||
      !target ||
      recError ||
      recLoading ||
      !hasMoreRecommendations
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadRecommendations();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    hasMoreRecommendations,
    isSearchActive,
    loadRecommendations,
    recError,
    recLoading,
  ]);

  return (
    <AppShell>
      <main className="pb-[calc(176px+env(safe-area-inset-bottom))]">
        {/* SEARCH HEADER */}
        <header
          className="rounded-b-[26px] px-[18px] pb-[18px] pt-5 text-surface"
          style={{ background: "linear-gradient(155deg,#0E1B1E,#1B3438)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-[20px] font-extrabold -tracking-[0.02em]">
              mobi<span className="text-teal">x</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/jual-mobil"
                className="rounded-full bg-teal px-3 py-2 text-[10px] font-extrabold text-ink no-underline min-[390px]:text-[11px]"
              >
                Cek Harga Unit
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={logout}
                  aria-label={`Keluar dari akun ${user.display_name || user.username}`}
                  className="rounded-full border border-white/20 bg-white/10 px-2.5 py-2 text-[10px] font-extrabold text-white min-[390px]:text-[11px]"
                >
                  Keluar
                </button>
              )}
            </div>
          </div>
          <h1 className="m-0 mb-1 mt-3.5 -tracking-[0.01em] text-[22px] font-extrabold leading-[1.2]">
            Mau Jual Mobil{" "}
            <span className="font-serif text-[22px] font-semibold italic text-teal">
              Apa
            </span>{" "}
            Hari Ini?
          </h1>
          <p className="m-0 mb-3.5 text-[12px] text-white/65">
            2.400+ unit ready · inspeksi 175 titik · garansi mesin
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setDebouncedQuery(query.trim());
              setSuggestionsOpen(false);
              window.requestAnimationFrame(() =>
                searchResultsRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                }),
              );
            }}
            className="flex items-center gap-2.5 rounded-2xl bg-surface px-3.5 py-[13px] shadow-[0_8px_24px_-10px_rgba(14,27,30,0.3)]"
          >
            <Search size={16} strokeWidth={2} className="flex-shrink-0 text-teal-deep" />
            <input
              value={query}
              onFocus={() => setSuggestionsOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSuggestionsOpen(true);
              }}
              placeholder="Cari merek, tipe, atau nopol…"
              enterKeyHint="search"
              aria-label="Cari merek, tipe, atau nomor polisi"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-placeholder"
            />
          </form>
          {query.trim() && suggestionsOpen && (
            <div className="mt-2 overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_8px_24px_-10px_rgba(14,27,30,0.3)]">
              {searchIsPending && (
                <div className="px-3.5 py-3 text-[12px] text-muted">
                  Mencari…
                </div>
              )}
              {!searchIsPending &&
                !recError &&
                recItems.slice(0, 5).map((unit) => (
                  <Link
                    key={unit.id}
                    href={`/unit/${unit.slug}`}
                    className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 text-inherit no-underline last:border-b-0"
                  >
                    <Photo
                      className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg"
                      src={unit.thumbnail}
                      alt={unit.title}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-[12.5px] font-bold text-ink">
                        {unit.title}
                      </div>
                      <div className="text-[11px] text-muted">
                        Rp {formatJt(unit.price)} · {unit.year}
                      </div>
                      <div className="line-clamp-1 text-[10.5px] text-muted">
                        Nopol{" "}
                        <span className="font-semibold uppercase text-mid">
                          {unit.plateNo || "belum tersedia"}
                        </span>{" "}
                        · {unit.branch}
                      </div>
                    </div>
                  </Link>
                ))}
              {!searchIsPending && recError && (
                <div className="px-3.5 py-3 text-[12px] text-muted">
                  Gagal memuat suggestion. Coba ketik ulang.
                </div>
              )}
              {!searchIsPending && !recError && recItems.length === 0 && (
                <div className="px-3.5 py-3 text-[12px] text-muted">
                  Tidak ada unit yang cocok dengan "{debouncedQuery}".
                </div>
              )}
              {!searchIsPending && !recError && recItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSuggestionsOpen(false);
                    searchResultsRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="block w-full border-t border-line bg-surface px-3.5 py-2.5 text-center text-[12px] font-bold text-teal-deep"
                >
                  Lihat semua {recTotal} hasil di beranda →
                </button>
              )}
            </div>
          )}
          <div className="scroll-x -mx-[18px] mt-3 flex gap-2 overflow-x-auto px-[18px] pb-0.5">
            {BUDGET_CHIPS.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="flex-shrink-0 whitespace-nowrap rounded-full border border-white/[0.22] bg-white/10 px-3.5 py-[7px] text-[11.5px] font-semibold text-surface no-underline"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </header>

        {/* CARI PER MEREK */}
        {!query.trim() && (
          <section className="px-[18px] pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="m-0 -tracking-[0.01em] text-[15px] font-extrabold text-ink">
                Cari per merek
              </h2>
              <Link
                href="/katalog"
                className="whitespace-nowrap text-[11.5px] font-bold text-teal-deep no-underline"
              >
                Semua merek
              </Link>
            </div>
            <div className="scroll-x -mx-[18px] mt-3 flex gap-2 overflow-x-auto px-[18px] pb-0.5">
              {BRANDS.map((brand) => (
                <Link
                  key={brand.label}
                  href={
                    brand.label === "Lainnya"
                      ? "/katalog"
                      : `/katalog?q=${encodeURIComponent(brand.label)}`
                  }
                  className="flex w-[74px] flex-shrink-0 flex-col items-center gap-1 rounded-[14px] border border-line bg-surface px-1 pb-2 pt-2 no-underline"
                >
                  <span className="flex h-[28px] w-[28px] items-center justify-center overflow-hidden rounded-full border border-line bg-surface">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.label}
                        loading="lazy"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-[13px] font-extrabold text-mid">
                        +
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-semibold text-muted">
                    {brand.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* LIVE KATALOG */}
        <section ref={searchResultsRef} className="scroll-mt-3 px-[18px] pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0 -tracking-[0.01em] text-[15px] font-extrabold text-ink">
              {isSearchActive
                ? `Hasil pencarian "${debouncedQuery}"`
                : "Live katalog"}
            </h2>
            {isSearchActive && !recLoading ? (
              <span className="whitespace-nowrap text-[11.5px] font-bold text-teal-deep">
                {recTotal} unit
              </span>
            ) : (
              <Link
                href="/katalog"
                className="whitespace-nowrap text-[11.5px] font-bold text-teal-deep no-underline"
              >
                Filter
              </Link>
            )}
          </div>
          <div className="scroll-x -mx-[18px] mt-3 flex gap-2 overflow-x-auto px-[18px] pb-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full border px-[15px] py-[9px] text-[12px] font-bold ${
                activeCategory === null
                  ? "border-teal-tint-border bg-teal-tint text-teal-deep"
                  : "border-line bg-surface text-mid"
              }`}
            >
              Semua
            </button>
            {(categories.data ?? []).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-[15px] py-[9px] text-[12px] font-bold ${
                  activeCategory === c
                    ? "border-teal-tint-border bg-teal-tint text-teal-deep"
                    : "border-line bg-surface text-mid"
                }`}
              >
                {prettyCategory(c)}
              </button>
            ))}
          </div>
          {isSearchActive ? (
            <div className="mt-3 flex flex-col gap-2.5">
              {recLoading &&
                recItems.length === 0 &&
                Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonRow key={`search-skeleton-${index}`} />
                ))}
              {recItems.map((unit) => (
                <UnitRow key={unit.id} unit={unit} />
              ))}
              {!recLoading && recError && recItems.length === 0 && (
                <div className="rounded-2xl border border-line bg-surface px-4 py-8 text-center text-[13px] text-muted">
                  Gagal memuat hasil pencarian.
                </div>
              )}
              {!recLoading && recError && recItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => loadRecommendations()}
                  className="mt-1 rounded-[14px] border border-line bg-surface py-3.5 text-[14px] font-bold text-ink"
                >
                  Coba muat lagi
                </button>
              )}
              {!recLoading && !recError && recItems.length === 0 && (
                <div className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
                  Tidak ada unit yang cocok dengan pencarianmu.
                </div>
              )}
              {!recLoading &&
                !recError &&
                recItems.length > 0 &&
                hasMoreRecommendations && (
                  <button
                    type="button"
                    onClick={() => loadRecommendations()}
                    className="mt-1 rounded-[14px] border border-line bg-surface py-3.5 text-[14px] font-bold text-ink"
                  >
                    Muat lebih banyak
                  </button>
                )}
              {recLoading && recItems.length > 0 && (
                <div className="py-2 text-center text-[12px] text-muted">
                  Memuat…
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {recItems.map((unit) => (
                  <RecCard key={unit.id} unit={unit} />
                ))}
                {recLoading &&
                  Array.from({ length: recItems.length ? 2 : 6 }).map(
                    (_, index) => (
                      <RecSkeleton key={`rec-skeleton-${index}`} />
                    ),
                  )}
              </div>
              {!recLoading && recError && recItems.length === 0 && (
                <div className="py-6 text-center text-[12px] text-muted">
                  Gagal memuat katalog.
                </div>
              )}
              {!recLoading && recError && recItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => loadRecommendations()}
                  className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[12px] font-bold text-teal-deep"
                >
                  Coba muat lagi
                </button>
              )}
              {!recLoading && !recError && recItems.length === 0 && (
                <div className="py-6 text-center text-[12px] text-muted">
                  Belum ada unit katalog.
                </div>
              )}
              <div
                ref={recLoadMoreRef}
                className="h-1"
                aria-hidden="true"
              />
            </>
          )}
        </section>

        {/* BANNER KEAGENAN */}
        <section
          className="mx-[18px] mt-[22px] rounded-[22px] p-[18px] text-surface"
          style={{ background: "linear-gradient(150deg,#0E1B1E,#1B3438)" }}
        >
          <div className="text-[15px] font-extrabold leading-[1.3]">
            Jual unit Mobix, dapat{" "}
            <span className="font-serif font-semibold italic text-teal">
              komisi puluhan juta
            </span>
          </div>
          <p className="m-0 mt-2 text-[12px] leading-[1.5] text-white/65">
            Share katalog ke jaringanmu, tim Mobix yang urus hitungan, survei, sampai
            serah terima. 1.240+ agen sudah gabung.
          </p>
          <Link
            href="/daftar"
            className="mt-3 inline-block rounded-xl bg-teal px-4 py-2.5 text-[12.5px] font-extrabold text-ink no-underline"
          >
            Gabung jadi agen →
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="px-[18px] pb-1 pt-[26px] text-center text-[11px] text-muted">
          © {new Date().getFullYear()} agenmobix.id ·{" "}
          <a href="#" className="font-semibold text-teal-deep no-underline">
            Berita
          </a>{" "}
          ·{" "}
          <a href="#" className="font-semibold text-teal-deep no-underline">
            Customer Care
          </a>
        </footer>
      </main>

      <FloatingContactCta bottomClassName="bottom-[calc(112px+env(safe-area-inset-bottom))]" />
      <BottomNav active="beranda" />
    </AppShell>
  );
}
