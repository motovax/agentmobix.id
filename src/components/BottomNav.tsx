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

const ITEMS: NavItem[] = [
  { href: "/katalog", label: "Produk", Icon: NavProduk, key: "produk" },
  { href: "/hot-deals", label: "Hot Deals", Icon: NavHotDeals, key: "hot" },
  { href: "/", label: "Beranda", Icon: NavHome, key: "beranda" },
  { href: "/lokasi", label: "Lokasi", Icon: NavLokasi, key: "lokasi" },
  { href: "/ai", label: "Contact", Icon: NavContact, key: "contact" },
];

/** Floating sticky bottom tab bar (only shown on Beranda, per the design). */
export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="sticky bottom-3.5 z-30 mx-3.5 mb-4 grid grid-cols-5 gap-1 rounded-3xl border border-line bg-surface p-2.5 shadow-nav">
      {ITEMS.map(({ href, label, Icon, key }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            className={[
              "flex flex-col items-center gap-[3px] py-1.5 text-[10px] no-underline",
              isActive
                ? "rounded-2xl bg-teal-tint font-bold text-ink"
                : "font-semibold text-muted",
            ].join(" ")}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
