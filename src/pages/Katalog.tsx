import { useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { UnitRow } from "../components/UnitRow";
import { ChevronLeft, Search, Sliders } from "../components/icons";
import { CATALOG, CATEGORY_FILTERS } from "../data/catalog";

export function Katalog() {
  const [active, setActive] = useState("Semua");
  const [query, setQuery] = useState("Avanza");

  const filtered = CATALOG.filter((u) => {
    const matchCat = active === "Semua" || u.category === active;
    const matchQuery =
      query.trim() === "" ||
      u.title.toLowerCase().includes(query.trim().toLowerCase());
    return matchCat && matchQuery;
  });

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
          {CATEGORY_FILTERS.map((c) => {
            const isActive = c.label === active;
            return (
              <button
                key={c.label}
                onClick={() => setActive(c.label)}
                className={`whitespace-nowrap rounded-full px-3 py-[7px] text-[12px] font-semibold ${
                  isActive
                    ? "bg-ink text-surface"
                    : "border border-line bg-surface text-mid"
                }`}
              >
                {c.label} · {c.count}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[12px] text-muted">187 unit ready · diperbarui tadi</span>
          <span className="text-[12px] font-semibold text-teal-deep">
            Komisi tertinggi ↓
          </span>
        </div>

        {filtered.map((u) => (
          <UnitRow key={u.id} unit={u} />
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
            Tidak ada unit yang cocok dengan pencarianmu.
          </div>
        )}

        <div className="py-1 text-center text-[12px] text-muted">
          Menampilkan {filtered.length} dari 187 unit
        </div>
        <div className="h-5" />
      </main>
    </AppShell>
  );
}
