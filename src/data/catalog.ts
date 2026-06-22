// Mock catalog data faithful to the design handoff.
//
// In production these come from the Mobix API (POST /daftar-produk,
// POST /detail-produk) via a thin server-side proxy that holds the bearer
// token — see docs. Keeping the shape close to the design lets that swap be a
// drop-in: replace the arrays below with fetched `ProductListItem` data.

export type UnitBadge = "Baru masuk" | "Turun harga" | "Premium" | null;

export interface Unit {
  /** stable id (Mobix `id` — used for diffing on a real-time feed) */
  id: string;
  slug: string;
  /** short id code shown on detail, e.g. "A-10428" */
  code: string;
  title: string;
  branch: string;
  /** harga jual (IDR) */
  price: number;
  /** harga lama untuk unit turun harga (IDR), null kalau tidak turun */
  oldPrice: number | null;
  /** uang muka (IDR) — 20% dari harga di Mobix */
  tdp: number;
  /** cicilan per bulan tenor 60 (IDR) */
  cicilan: number;
  /** komisi agen (IDR) */
  komisi: number;
  /** odometer dalam km */
  km: number;
  badge: UnitBadge;
  category: "MPV" | "LCGC" | "SUV" | "Sedan" | "Hatchback";
  transmission: "Automatic" | "Manual";
  fuel: "Bensin" | "Diesel";
  year: number;
  plate: string;
  tax: "Hidup" | "Mati";
  /** jumlah foto galeri */
  photos: number;
  pic: { name: string; initials: string; branchLabel: string };
  branchArea: string;
  description: string;
}

/** Catalog — order roughly by commission desc (matches "Komisi tertinggi ↓"). */
export const CATALOG: Unit[] = [
  {
    id: "u-avanza-10428",
    slug: "toyota-avanza-g-at-2021",
    code: "A-10428",
    title: "Toyota Avanza G AT 2021",
    branch: "BSD",
    branchArea: "Tangerang Selatan",
    price: 165_000_000,
    oldPrice: null,
    tdp: 33_000_000,
    cicilan: 3_428_000,
    komisi: 5_500_000,
    km: 36_420,
    badge: "Baru masuk",
    category: "MPV",
    transmission: "Automatic",
    fuel: "Bensin",
    year: 2021,
    plate: "B · Tangsel",
    tax: "Hidup",
    photos: 8,
    pic: { name: "Bu Sinta", initials: "SN", branchLabel: "PIC Cabang BSD" },
    description:
      "Avanza G AT tahun 2021, tangan pertama dari baru, service record lengkap di bengkel resmi. Interior orisinal terawat, ban tebal, kaki-kaki senyap. Sudah lolos inspeksi 175 titik Mobix dan bergaransi mesin & transmisi 1 tahun.",
  },
  {
    id: "u-brio-2020",
    slug: "honda-brio-satya-cvt-2020",
    code: "B-20913",
    title: "Honda Brio Satya CVT 2020",
    branch: "Cibubur",
    branchArea: "Bekasi",
    price: 142_000_000,
    oldPrice: null,
    tdp: 28_000_000,
    cicilan: 2_900_000,
    komisi: 3_200_000,
    km: 42_310,
    badge: null,
    category: "LCGC",
    transmission: "Automatic",
    fuel: "Bensin",
    year: 2020,
    plate: "B · Bekasi",
    tax: "Hidup",
    photos: 6,
    pic: { name: "Pak Andi", initials: "AN", branchLabel: "PIC Cabang Cibubur" },
    description:
      "Brio Satya CVT 2020 irit BBM, cocok harian dan mobilitas kota. Pajak panjang, kelistrikan normal, AC dingin. Lolos inspeksi Mobix dan bergaransi mesin & transmisi 1 tahun.",
  },
  {
    id: "u-xenia-2019",
    slug: "daihatsu-xenia-r-mt-2019",
    code: "X-19842",
    title: "Daihatsu Xenia R MT 2019",
    branch: "Bekasi",
    branchArea: "Bekasi",
    price: 138_000_000,
    oldPrice: 145_000_000,
    tdp: 28_000_000,
    cicilan: 2_800_000,
    komisi: 4_700_000,
    km: 57_120,
    badge: "Turun harga",
    category: "MPV",
    transmission: "Manual",
    fuel: "Bensin",
    year: 2019,
    plate: "B · Bekasi",
    tax: "Hidup",
    photos: 7,
    pic: { name: "Pak Andi", initials: "AN", branchLabel: "PIC Cabang Bekasi" },
    description:
      "Xenia R MT 2019 keluarga, kabin lega 7 penumpang. Body mulus, mesin kering, kopling masih empuk. Lolos inspeksi 175 titik Mobix, bergaransi mesin & transmisi 1 tahun.",
  },
  {
    id: "u-pajero-2018",
    slug: "mitsubishi-pajero-sport-dakar-2018",
    code: "P-18377",
    title: "Pajero Sport Dakar 2018",
    branch: "Bandung",
    branchArea: "Bandung",
    price: 410_000_000,
    oldPrice: null,
    tdp: 82_000_000,
    cicilan: 8_400_000,
    komisi: 15_000_000,
    km: 62_540,
    badge: "Premium",
    category: "SUV",
    transmission: "Automatic",
    fuel: "Diesel",
    year: 2018,
    plate: "D · Bandung",
    tax: "Hidup",
    photos: 9,
    pic: { name: "Bu Maya", initials: "MY", branchLabel: "PIC Cabang Bandung" },
    description:
      "Pajero Sport Dakar 2018 diesel bertenaga, tarikan responsif, irit untuk kelasnya. Interior rapi, jok kulit terawat, fitur lengkap. Lolos inspeksi Mobix, bergaransi mesin & transmisi 1 tahun.",
  },
  {
    id: "u-ertiga-2021",
    slug: "suzuki-ertiga-gx-at-2021",
    code: "E-21556",
    title: "Suzuki Ertiga GX AT 2021",
    branch: "Depok",
    branchArea: "Depok",
    price: 188_000_000,
    oldPrice: null,
    tdp: 38_000_000,
    cicilan: 3_800_000,
    komisi: 6_200_000,
    km: 29_870,
    badge: null,
    category: "MPV",
    transmission: "Automatic",
    fuel: "Bensin",
    year: 2021,
    plate: "B · Depok",
    tax: "Hidup",
    photos: 8,
    pic: { name: "Pak Andi", initials: "AN", branchLabel: "PIC Cabang Depok" },
    description:
      "Ertiga GX AT 2021 low km, kondisi seperti baru. Interior wangi, ban tebal, mesin halus. Lolos inspeksi 175 titik Mobix, bergaransi mesin & transmisi 1 tahun.",
  },
  {
    id: "u-innova-2018",
    slug: "toyota-innova-reborn-v-at-2018",
    code: "I-18099",
    title: "Innova Reborn V AT 2018",
    branch: "Surabaya",
    branchArea: "Surabaya",
    price: 318_000_000,
    oldPrice: null,
    tdp: 64_000_000,
    cicilan: 6_500_000,
    komisi: 11_000_000,
    km: 71_230,
    badge: null,
    category: "MPV",
    transmission: "Automatic",
    fuel: "Diesel",
    year: 2018,
    plate: "L · Surabaya",
    tax: "Hidup",
    photos: 9,
    pic: { name: "Pak Bayu", initials: "BY", branchLabel: "PIC Cabang Surabaya" },
    description:
      "Innova Reborn V AT 2018 diesel, tipe tertinggi, captain seat. Kabin senyap, AC double blower dingin, mesin halus tanpa rembes. Lolos inspeksi Mobix, bergaransi mesin & transmisi 1 tahun.",
  },
];

/** Hot deals — unit turun harga + komisi ekstra +Rp 1 juta tiap closing. */
export interface HotDeal {
  slug: string;
  title: string;
  branch: string;
  price: number;
  oldPrice: number;
  /** potongan ditampilkan sebagai badge, mis. "-7jt" */
  discountLabel: string;
  komisi: number;
  komisiExtra: number;
}

export const HOT_DEALS: HotDeal[] = [
  {
    slug: "daihatsu-xenia-r-mt-2019",
    title: "Daihatsu Xenia R MT 2019",
    branch: "Bekasi",
    price: 138_000_000,
    oldPrice: 145_000_000,
    discountLabel: "-7jt",
    komisi: 4_700_000,
    komisiExtra: 1_000_000,
  },
  {
    slug: "mitsubishi-pajero-sport-dakar-2018",
    title: "Pajero Sport Dakar 2018",
    branch: "Bandung",
    price: 410_000_000,
    oldPrice: 422_000_000,
    discountLabel: "-12jt",
    komisi: 15_000_000,
    komisiExtra: 1_000_000,
  },
  {
    slug: "toyota-innova-reborn-v-at-2018",
    title: "Innova Reborn V AT 2018",
    branch: "Surabaya",
    price: 313_000_000,
    oldPrice: 318_000_000,
    discountLabel: "-5jt",
    komisi: 11_000_000,
    komisiExtra: 1_000_000,
  },
];

export interface Branch {
  name: string;
  units: number;
  address: string;
  hours: string;
  pic: string;
}

export const BRANCHES: Branch[] = [
  {
    name: "Mobix BSD",
    units: 64,
    address: "Jl. Pahlawan Seribu, BSD City, Tangerang Selatan",
    hours: "09.00–20.00",
    pic: "Bu Sinta",
  },
  {
    name: "Mobix Cibubur",
    units: 38,
    address: "Jl. Alternatif Cibubur, Bekasi",
    hours: "09.00–20.00",
    pic: "Pak Andi",
  },
  {
    name: "Mobix Bandung",
    units: 41,
    address: "Jl. Soekarno Hatta, Bandung",
    hours: "09.00–20.00",
    pic: "Bu Maya",
  },
  {
    name: "Mobix Surabaya",
    units: 28,
    address: "Jl. Ahmad Yani, Surabaya",
    hours: "09.00–20.00",
    pic: "Pak Bayu",
  },
];

export interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
  gradient: string;
  textOnGradient: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    initials: "RM",
    name: "Rizky M., Bekasi",
    role: "Agen sejak Maret 2026 · 23 unit closing",
    quote:
      "Bulan pertama saya masih belajar sistemnya. Bulan kedua dapat Rp 18 juta. Sekarang stabil di kisaran 25–30 juta sebulan, modalnya cuma HP dan jaringan WhatsApp.",
    gradient: "linear-gradient(135deg,#1ECFCB,#0FA8A4)",
    textOnGradient: "#0E1B1E",
  },
  {
    initials: "SP",
    name: "Sari P., Bandung",
    role: "Ibu rumah tangga · 14 unit closing",
    quote:
      "AI Mobix kerasa banget bantunya. Customer minta video keliling, tinggal chat, dalam setengah jam foto dan video sudah siap. Saya tinggal teruskan.",
    gradient: "linear-gradient(135deg,#F5B764,#E08A2C)",
    textOnGradient: "#FFFFFF",
  },
  {
    initials: "DA",
    name: "Dimas A., Surabaya",
    role: "Eks sales dealer · 41 unit closing",
    quote:
      "Pernah closing Pajero Sport, komisi Rp 15 juta cair dalam tiga hari. Bukti transfernya saya pinned di Instagram supaya kenalan saya percaya.",
    gradient: "linear-gradient(135deg,#7B6CF6,#4F3EE0)",
    textOnGradient: "#FFFFFF",
  },
];

/** Category filter chips on the catalog screen. */
export const CATEGORY_FILTERS = [
  { label: "Semua", count: 187 },
  { label: "MPV", count: 64 },
  { label: "LCGC", count: 41 },
  { label: "SUV", count: 38 },
  { label: "Sedan", count: 16 },
];

export function findUnit(slug: string): Unit | undefined {
  return CATALOG.find((u) => u.slug === slug);
}
