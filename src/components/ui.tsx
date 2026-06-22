import type { ReactNode } from "react";
import type { UnitBadge } from "../data/catalog";

/**
 * Hatched photo placeholder. The design renders car photos as a diagonal hatch;
 * swap `src` in once real IMS photos are wired (keep the hatch as the loading /
 * onError fallback).
 */
export function Photo({
  className = "",
  large = false,
  src,
  alt,
  children,
}: {
  className?: string;
  large?: boolean;
  src?: string;
  alt?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative ${large ? "bg-hatch-lg" : "bg-hatch"} ${className}`}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {children}
    </div>
  );
}

/** Corner status badge used on cards. */
export function Badge({ kind }: { kind: UnitBadge }) {
  if (!kind) return null;
  const styles: Record<NonNullable<UnitBadge>, string> = {
    "Baru masuk": "bg-surface text-teal-deep border border-teal-tint-border",
    "Turun harga": "bg-surface text-danger border border-danger-border",
    Premium: "bg-ink text-teal",
  };
  return (
    <span
      className={`rounded-lg px-2 py-[3px] text-[10px] font-bold ${styles[kind]}`}
    >
      {kind}
    </span>
  );
}

/** Short badge variant for list thumbnails ("Baru"/"Turun"/"Premium"). */
export function ThumbBadge({ kind }: { kind: UnitBadge }) {
  if (!kind) return null;
  const map: Record<NonNullable<UnitBadge>, { label: string; cls: string }> = {
    "Baru masuk": {
      label: "Baru",
      cls: "bg-surface text-teal-deep border border-teal-tint-border",
    },
    "Turun harga": {
      label: "Turun",
      cls: "bg-surface text-danger border border-danger-border",
    },
    Premium: { label: "Premium", cls: "bg-ink text-teal" },
  };
  const { label, cls } = map[kind];
  return (
    <span
      className={`absolute left-1.5 top-1.5 rounded-[7px] px-[7px] py-0.5 text-[9px] font-bold ${cls}`}
    >
      {label}
    </span>
  );
}
