// Inline stroke icons recreated from the design handoff (stroke-width 1.3–1.7,
// round caps/joins, currentColor). Color is controlled by the parent's text
// color so the same icon works on light and dark surfaces.

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
});

export function Search({ size = 16, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 16 16" className={className}>
      <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <line x1="11" y1="11" x2="15" y2="15" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function Moon({ size = 20, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" className={className}>
      <path d="M16 11.5A7 7 0 1 1 8.5 4a5.5 5.5 0 0 0 7.5 7.5z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRight({ size = 14, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 14 14" className={className}>
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Share / external-link arrow (up-right). */
export function ShareArrow({ size = 14, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 18 18" className={className}>
      <path d="M3 15l12-12M15 3H8M15 3v7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeft({ size = 18, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 18 18" className={className}>
      <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDown({ size = 14, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 14 14" className={className}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 13, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 13 13" className={className}>
      <path d="M2 7l3 3 6-7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Chat({ size = 18, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 18 18" className={className}>
      <path d="M3 4h12v8H7l-3 3V4z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function Calculator({ size = 18, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 18 18" className={className}>
      <rect x="3" y="2.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M6 5.5h6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M6 9h.01M9 9h.01M12 9h.01M6 12h.01M9 12h.01M12 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Plus({ size = 20, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" className={className}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function Send({ size = 20, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" className={className}>
      <path d="M4 10h11M10 5l5 5-5 5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sliders({ size = 16, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 16 16" className={className}>
      <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function Info({ size = 16, className, strokeWidth = 1.3 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 16 16" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

export function Camera({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="8" cy="10" r="1.6" stroke="currentColor" strokeWidth={1.3} />
      <path d="M3 15l4-3 3 2 3-3 4 3" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

export function MapPin({ size = 20, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M11 20s-6-5-6-10a6 6 0 1 1 12 0c0 5-6 10-6 10z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="11" cy="9" r="2.2" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function Star({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M11 3l2.5 5 5.5.8-4 3.9.9 5.5L11 16.5 6.1 19l.9-5.5-4-3.9 5.5-.8L11 3z" fill="currentColor" />
    </svg>
  );
}

export function Sparkles({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 18 18" className={className}>
      <path d="M7.8 2.5l1.1 3.1 3.1 1.1-3.1 1.1-1.1 3.1-1.1-3.1-3.1-1.1 3.1-1.1 1.1-3.1z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M13.2 10.8l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function Copy({ size = 20, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" className={className}>
      <path d="M7 3h9a1 1 0 0 1 1 1v9" stroke="currentColor" strokeWidth={strokeWidth} />
      <rect x="3" y="6" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function Download({ size = 20, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" className={className}>
      <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16h12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function Play({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" className={className}>
      <path d="M7 4.5v11l8-5.5-8-5.5z" fill="currentColor" />
    </svg>
  );
}

export function Close({ size = 16, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 16 16" className={className}>
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/* ---- filled / brand icons ---- */

export function WhatsApp({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 18 18" className={className}>
      <path
        d="M14 11.5l-2.3-1c-.3-.1-.6 0-.8.2l-.7.9c-1.4-.7-2.5-1.8-3.2-3.2l.9-.7c.2-.2.3-.5.2-.8L7.1 4.6c-.2-.4-.6-.6-1-.4l-1.4.4c-.4.1-.7.5-.7 1 0 4.9 4 9 9 9 .5 0 .9-.3 1-.7l.4-1.4c.1-.5-.1-.9-.4-1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Instagram({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <rect x="2.5" y="2.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="16" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

export function Facebook({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M14 4h-2.5C10 4 9 5 9 6.5V9H7v3h2v7h3v-7h2.5l.5-3H12V7c0-.6.4-1 1-1h1V4z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function FacebookSolid({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M14 4h-2.5C10 4 9 5 9 6.5V9H7v3h2v7h3v-7h2.5l.5-3H12V7c0-.6.4-1 1-1h1V4z" fill="currentColor" />
    </svg>
  );
}

export function YouTube({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <rect x="2" y="5" width="18" height="12" rx="3" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M10 8l4 3-4 3V8z" fill="currentColor" />
    </svg>
  );
}

export function TikTok({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M13 3v11a3 3 0 1 1-3-3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M13 3c.5 2 2.2 3.5 4.5 3.7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function InstagramSolid({ size = 26, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <rect x="2.5" y="2.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="16" cy="6" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppSolid({ size = 28, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 28 28" className={className}>
      <path
        d="M22 18l-3.6-1.5c-.4-.2-.9 0-1.2.3l-1 1.4c-2.2-1.1-4-2.8-5-5l1.3-1.1c.4-.3.5-.8.3-1.2L11.3 7c-.3-.6-1-.9-1.6-.6l-2.2.7c-.6.2-1 .8-1 1.5C6.5 16.4 11.6 21.5 19.4 22c.7 0 1.4-.4 1.6-1l.7-2.2c.2-.7-.2-1.4-.7-1.7z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Marketplace({ size = 24, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" className={className}>
      <path d="M5 7h14v12H5z" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M5 7l3-3h8l3 3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function TikTokSolid({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.98a8.23 8.23 0 0 0 4.81 1.54V7.07a4.85 4.85 0 0 1-1.04-.38z" />
    </svg>
  );
}

export function Telegram({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.2 4.3 2.8 11.5c-1.3.5-1.3 1.2-.2 1.6l4.6 1.4 10.7-6.7c.5-.3 1-.1.6.2L8.3 16v2.9l2.5-2.4 4.9 3.7c.9.5 1.6.2 1.8-.8L21.9 5.7c.3-1.2-.4-1.7-1-1.4z" />
    </svg>
  );
}

export function XTwitter({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* ---- bottom nav icons ---- */

export function NavProduk({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M11 2.5L3.5 6v10L11 19.5 18.5 16V6L11 2.5z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M3.5 6L11 9.5 18.5 6M11 9.5v10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function NavHotDeals({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M3 11V3h8l8 8-8 8-8-8z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function NavHome({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M3 10l8-7 8 7v9h-5v-6h-6v6H3v-9z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function NavLokasi({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M11 19s-6-5-6-10a6 6 0 1 1 12 0c0 5-6 10-6 10z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="11" cy="9" r="2.2" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function NavContact({ size = 22, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 22 22" className={className}>
      <path d="M4 5h14v10H8l-4 4V5z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}
