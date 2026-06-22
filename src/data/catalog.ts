// Static program content that has no Mobix-API source (testimonials, branch
// directory). Live vehicle listings come from the Mobix API — see src/lib/mobix.ts.

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
