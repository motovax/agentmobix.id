import { Link } from "wouter";
import {
  NavProduk,
  NavHotDeals,
  NavHome,
  NavLokasi,
  NavContact,
} from "./icons";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  key: string;
};

const WA_ADMIN = `https://wa.me/6285701959826?text=${encodeURIComponent("Halo Admin, mau tanya-tanya soal program agen Mobix dulu boleh? 🙏")}`;

const ITEMS: NavItem[] = [
  { href: "/katalog", label: "Produk", Icon: NavProduk, key: "produk" },
  { href: "/hot-deals", label: "Hot Deals", Icon: NavHotDeals, key: "hot" },
  { href: "/", label: "Beranda", Icon: NavHome, key: "beranda" },
  { href: "/lokasi", label: "Lokasi", Icon: NavLokasi, key: "lokasi" },
  { href: WA_ADMIN, label: "Contact", Icon: NavContact, key: "contact" },
];

/** Floating sticky bottom tab bar (only shown on Beranda, per the design). */
export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-9 left-1/2 z-30 grid w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl border border-line bg-surface p-2.5 shadow-nav">
      {ITEMS.map(({ href, label, Icon, key }) => {
        const isActive = key === active;
        const className = [
          "flex flex-col items-center gap-[3px] py-1.5 text-[10px] no-underline",
          isActive
            ? "rounded-2xl bg-teal-tint font-bold text-ink"
            : "font-semibold text-muted",
        ].join(" ");
        const content = <><Icon size={22} /><span>{label}</span></>;
        return href.startsWith("http") ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {content}
          </a>
        ) : (
          <Link key={key} href={href} className={className}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
