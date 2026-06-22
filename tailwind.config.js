/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1B1E",
        "ink-2": "#1B3438",
        teal: "#1ECFCB",
        "teal-deep": "#0FA8A4",
        "teal-tint": "#E6FBFA",
        "teal-tint-border": "#BFEFEE",
        "teal-soft": "#7CBEBC",
        "app-bg": "#E9ECEF",
        surface: "#FFFFFF",
        "surface-2": "#F4F1F4",
        "surface-3": "#FAFBFC",
        field: "#F6F8F9",
        line: "#E2E4E7",
        "line-2": "#DEDFE2",
        muted: "#6B7E83",
        mid: "#344A4E",
        placeholder: "#9AA5AA",
        danger: "#B33D1A",
        "danger-bg": "#FFE7E0",
        "danger-border": "#FFD3C5",
        whatsapp: "#25D366",
        "whatsapp-cta": "#56C77A",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        serif: ['"Newsreader"', "Georgia", "serif"],
      },
      borderRadius: {
        frame: "40px",
      },
      boxShadow: {
        frame: "0 24px 60px -20px rgba(14,27,30,0.18)",
        nav: "0 8px 24px -10px rgba(14,27,30,0.12)",
        wa: "0 6px 14px -6px rgba(86,199,122,0.7)",
      },
      backgroundImage: {
        hatch:
          "repeating-linear-gradient(135deg,#EEF2F3 0 6px,#E0E7E9 6px 12px)",
        "hatch-lg":
          "repeating-linear-gradient(135deg,#EEF2F3 0 8px,#E0E7E9 8px 16px)",
      },
    },
  },
  plugins: [],
};
