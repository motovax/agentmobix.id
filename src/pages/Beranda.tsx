import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { UnitCard } from "../components/UnitCard";
import {
  Search,
  Moon,
  Chat,
  Instagram,
  Facebook,
  YouTube,
  TikTok,
} from "../components/icons";
import { SkeletonCard, Skeleton } from "../components/ui";
import { TESTIMONIALS } from "../data/catalog";
import { fetchUnits, toCardUnit } from "../lib/mobix";
import { fetchHotDeals, cmsImageUrl, type HotDeal } from "../lib/cms";
import { useAsync } from "../lib/useAsync";

const STATS = [
  { label: "Komisi/unit", value: "Mulai dari 2jt" },
  { label: "Stok ready", value: "185 unit" },
  { label: "Cair dalam", value: "3 hari" },
];

const STEPS = [
  {
    title: "Daftar lewat form pendek",
    caption:
      "Upload KTP dan tentukan rekening pencairan. Aktivasi otomatis dalam beberapa menit.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 15c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tint: false,
  },
  {
    title: "Share unit ke jaringan kamu",
    caption:
      "Tombol langsung ke WhatsApp, IG Story, Facebook, atau marketplace pilihan kamu.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 9l6-6 6 6M9 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    tint: false,
  },
  {
    title: "AI Mobix bantu follow-up",
    caption:
      "Minta foto detail, susun caption, atau estafetkan calon pembeli ke PIC cabang.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4h12v8H6l-3 3V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    tint: false,
  },
  {
    title: "Komisi cair ke rekening",
    caption: "Tiga hari kerja setelah unit terjual.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 9h14M11 5l5 4-5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    tint: true,
  },
];

function PromoRow({ item }: { item: HotDeal }) {
  const imgSrc = cmsImageUrl(item.thumbnail, "thumb");
  return (
    <Link
      href={`/promo/${item.slug}`}
      className="flex items-start gap-3.5 text-inherit no-underline"
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
          <div className="mt-1 text-[11px] text-muted line-clamp-2">{item.deskripsi}</div>
        )}
      </div>
    </Link>
  );
}

export function Beranda() {
  const featured = useAsync(
    () => fetchUnits({ limit: 8 }).then((r) => r.items.map(toCardUnit)),
    [],
  );
  const promos = useAsync(() => fetchHotDeals(), []);

  return (
    <AppShell>
      {/* SEARCH HEADER */}
      <div className="hidden items-center gap-2.5 border-b border-line-2 bg-surface-2 px-[18px] pb-3 pt-3.5">
        <Link
          href="/katalog"
          className="hidden flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 py-[11px] no-underline"
        >
          <Search className="text-muted" />
          <span className="text-[14px] text-placeholder">Cari di Mobix . . .</span>
        </Link>
        <button
          aria-label="Mode gelap"
          className="hidden h-9 w-9 items-center justify-center text-ink"
        >
          <Moon />
        </button>
        <Link
          href="/katalog"
          className="hidden flex-shrink-0 whitespace-nowrap rounded-full bg-teal-soft px-[18px] py-[11px] text-[14px] font-semibold text-surface no-underline"
        >
          Jual Mobil
        </Link>
      </div>

      {/* CONTENT */}
      <main className="flex flex-col gap-3.5 p-3.5 pb-[180px]">
        {/* HERO */}
        <section className="rounded-[22px] border border-line bg-surface p-[18px]">
          <div className="mb-3.5 flex items-start justify-between gap-3.5">
            <div className="flex-1">
              <div className="mb-1 text-[12px] font-medium text-muted">
                Program Keagenan
              </div>
              <h1 className="m-0 -tracking-[0.01em] text-[22px] font-extrabold leading-[1.2] text-ink">
                Jadi Agen Mobix,{" "}
                <span className="font-serif font-medium italic text-teal-deep">
                  komisi puluhan juta
                </span>{" "}
                tiap bulan.
              </h1>
            </div>
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-tint to-teal-tint-border">
              <img src="/mobix-logo.png" alt="Mobix" className="block h-auto w-[46px]" />
            </div>
          </div>
          <p className="m-0 mb-4 text-[13px] leading-[1.55] text-muted">
            Tanpa modal stok. Akses katalog unit yang siap jual, share ke jaringan
            kamu, dibantu AI Mobix dari foto sampai follow-up ke calon pembeli.
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex">
              <span className="inline-block h-[22px] w-[22px] rounded-full border-2 border-surface bg-gradient-to-br from-teal to-teal-deep" />
              <span className="-ml-[7px] inline-block h-[22px] w-[22px] rounded-full border-2 border-surface bg-gradient-to-br from-[#F5B764] to-[#E08A2C]" />
              <span className="-ml-[7px] inline-block h-[22px] w-[22px] rounded-full border-2 border-surface bg-gradient-to-br from-[#7B6CF6] to-[#4F3EE0]" />
            </div>
            <span className="text-[12px] text-muted">
              Sudah dipakai 1.240+ agen di seluruh Indonesia
            </span>
          </div>
        </section>

        {/* QUICK STATS */}
        <section className="grid grid-cols-3 gap-2.5">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-[18px] border border-line bg-surface px-3 py-3.5 text-center"
            >
              <div className="mb-1 text-[11px] text-muted">{s.label}</div>
              <div className="-tracking-[0.01em] text-[16px] font-extrabold text-ink">
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* KATALOG LIVE */}
        <section className="rounded-[22px] border border-line bg-surface pb-4 pt-[18px]">
          <div className="flex items-end justify-between gap-2.5 px-[18px] pb-3">
            <div>
              <h2 className="m-0 -tracking-[0.01em] text-[18px] font-extrabold text-ink">
                Yang siap kamu share hari ini
              </h2>
              <p className="m-0 mt-1 text-[12px] text-muted">
                Diperbarui beberapa saat lalu dari cabang.
              </p>
            </div>
            <Link
              href="/katalog"
              className="whitespace-nowrap text-[13px] font-bold text-teal-deep no-underline"
            >
              Lihat semua
            </Link>
          </div>
          <div className="scroll-x flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] pb-1.5 pt-1">
            {featured.loading &&
              Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            {!featured.loading &&
              (featured.data ?? []).map((u) => <UnitCard key={u.id} unit={u} />)}
            {!featured.loading && featured.error && (
              <div className="flex-1 py-6 text-center text-[12px] text-muted">
                Gagal memuat unit. Coba lagi nanti.
              </div>
            )}
            {!featured.loading &&
              !featured.error &&
              (featured.data ?? []).length === 0 && (
                <div className="flex-1 py-6 text-center text-[12px] text-muted">
                  Belum ada unit ready.
                </div>
              )}
          </div>
        </section>

        {/* CARA KERJA */}
        <section className="rounded-[22px] border border-line bg-surface p-[18px]">
          <h2 className="m-0 mb-1 -tracking-[0.01em] text-[18px] font-extrabold text-ink">
            Cara kerja program agen
          </h2>
          <p className="m-0 mb-3.5 text-[13px] leading-[1.5] text-muted">
            Empat tahap yang sama untuk setiap unit, dari pendaftaran sampai komisi
            diterima.
          </p>
          <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
            {STEPS.map((step) => (
              <li key={step.title} className="flex items-start gap-3.5">
                <div
                  className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl ${
                    step.tint ? "bg-teal-tint text-teal-deep" : "bg-field text-ink"
                  }`}
                >
                  {step.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-ink">{step.title}</div>
                  <div
                    className={`mt-0.5 text-[12px] leading-[1.5] ${
                      step.tint ? "font-semibold text-teal-deep" : "text-muted"
                    }`}
                  >
                    {step.caption}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* AI MOBIX CARD */}
        <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-ink to-ink-2 p-5 text-surface">
          <div className="absolute -right-8 -top-12 h-[200px] w-[200px] bg-[radial-gradient(circle,#1ECFCB_0%,transparent_70%)] opacity-[0.18]" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-teal text-[16px] font-extrabold text-ink">
                M
              </div>
              <div>
                <div className="text-[14px] font-bold">AI Mobix</div>
                <div className="text-[11px] text-[#A4D7D7]">
                  Asisten otomatis untuk agen
                </div>
              </div>
            </div>
            <p className="m-0 mb-4 text-[13px] leading-[1.55] text-[#C7DEE0]">
              Minta foto sisi kanan, video keliling unit, atau langsung sambungkan
              calon pembeli ke PIC cabang yang menyimpan mobilnya. Semuanya lewat
              satu chat.
            </p>
            <div className="flex flex-col gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[12px] text-[#C7DEE0]">
                "Tolong fotoin Avanza A-10428 dari sisi kanan & dashboard ya"
              </div>
              <div className="rounded-xl bg-teal px-3 py-2.5 text-[12px] font-semibold text-ink">
                Siap. Diteruskan ke tim cabang Pondok Bambu — estimasi 20 menit.
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONI */}
        <section className="rounded-[22px] border border-line bg-surface pb-4 pt-[18px]">
          <div className="px-[18px] pb-3">
            <h2 className="m-0 -tracking-[0.01em] text-[18px] font-extrabold text-ink">
              Cerita agen yang sudah jalan
            </h2>
            <p className="m-0 mt-1 text-[12px] text-muted">
              Dari ibu rumah tangga sampai eks sales dealer.
            </p>
          </div>
          <div className="scroll-x flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[18px] pb-1.5">
            {TESTIMONIALS.map((t) => (
              <article
                key={t.name}
                className="flex-[0_0_86%] snap-start rounded-[18px] border border-line bg-surface-3 p-3.5"
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-extrabold"
                    style={{ background: t.gradient, color: t.textOnGradient }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-ink">{t.name}</div>
                    <div className="text-[11px] text-muted">{t.role}</div>
                  </div>
                </div>
                <p className="m-0 text-[13px] leading-[1.5] text-mid">"{t.quote}"</p>
              </article>
            ))}
          </div>
        </section>

        {/* PENAWARAN / PROMO */}
        <section className="rounded-[22px] border border-line bg-surface p-[18px]">
          <div className="mb-3.5 flex items-center justify-between gap-2.5">
            <h2 className="m-0 -tracking-[0.01em] text-[18px] font-extrabold text-ink">
              Penawaran atau promo lainnya
            </h2>
            {(promos.data?.length ?? 0) > 3 && (
              <Link
                href="/promo"
                className="whitespace-nowrap text-[13px] font-bold text-teal-deep no-underline"
              >
                Lihat semua
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3.5">
            {promos.loading &&
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-20 w-[104px] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </div>
              ))}
            {!promos.loading && promos.error && (
              <div className="py-4 text-center text-[12px] text-muted">
                Gagal memuat promo.
              </div>
            )}
            {!promos.loading &&
              !promos.error &&
              (promos.data ?? []).slice(0, 3).map((item) => (
                <PromoRow key={item.slug} item={item} />
              ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="px-3.5 pb-1 pt-[18px] text-center">
          <p className="m-0 mb-3.5 text-[12px] leading-[1.5] text-muted">
            Hak Cipta © by PT Digital Sumber Sejahtera Motor.
            <br />
            Semua hak cipta dilindungi.
          </p>
          <div className="mb-[18px] flex flex-col items-center gap-2.5">
            <a href="#" className="text-[14px] font-semibold text-ink no-underline">
              Berita
            </a>
            <a href="#" className="text-[14px] font-semibold text-ink no-underline">
              Customer Care
            </a>
          </div>
          <div className="mt-6 flex items-center justify-center gap-[18px] text-muted">
            <a href="#" aria-label="Instagram" className="text-muted">
              <Instagram />
            </a>
            <a href="#" aria-label="Facebook" className="text-muted">
              <Facebook />
            </a>
            <a href="#" aria-label="YouTube" className="text-muted">
              <YouTube />
            </a>
            <a href="#" aria-label="TikTok" className="text-muted">
              <TikTok />
            </a>
          </div>
        </footer>

      </main>

      <a
        href={`https://wa.me/6285701959826?text=${encodeURIComponent("Halo Admin, mau tanya-tanya soal program agen Mobix dulu boleh? 🙏")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[120px] z-20 inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-[13px] font-bold text-white no-underline shadow-[0_6px_24px_rgba(37,211,102,0.4)] right-[max(14px,calc((100%-384px)/2))]"
      >
        <Chat size={20} className="text-white" />
        Tanya Admin
      </a>

      <BottomNav active="beranda" />
    </AppShell>
  );
}
