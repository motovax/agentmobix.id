import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { UnitBadge } from "../lib/mobix";

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
  contain = false,
  placeholderSrc,
}: {
  className?: string;
  large?: boolean;
  src?: string;
  alt?: string;
  children?: ReactNode;
  contain?: boolean;
  placeholderSrc?: string;
}) {
  const usePlaceholder = Boolean(placeholderSrc && placeholderSrc !== src);
  const [highResReady, setHighResReady] = useState(!usePlaceholder);

  useEffect(() => {
    setHighResReady(!usePlaceholder);
  }, [src, placeholderSrc]);

  return (
    <div
      className={`relative ${large ? "bg-hatch-lg" : "bg-hatch"} ${className}`}
    >
      {usePlaceholder && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${contain ? "object-contain" : "object-cover"} ${highResReady ? "opacity-0" : "opacity-100"} transition-opacity duration-500 blur-sm`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${contain ? "object-contain" : "object-cover"} ${usePlaceholder ? (highResReady ? "opacity-100" : "opacity-0") : "opacity-100"} transition-opacity duration-500`}
          onLoad={() => setHighResReady(true)}
          onError={(e) => {
            if (usePlaceholder) setHighResReady(false);
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {children}
    </div>
  );
}

/** Shimmer skeleton block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#E6EAEC] ${className}`} />;
}

/**
 * Image with shimmer sweep animation while loading, fades in when ready.
 * Parent must be `relative overflow-hidden` with a fallback background color.
 */
export function ShimmerImg({
  src,
  alt,
  imgClassName = "",
  loading = "lazy",
}: {
  src?: string;
  alt?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 overflow-hidden bg-[#DDE2E4]">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
        </div>
      )}
      {src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            setLoaded(true);
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </>
  );
}

/** Loading placeholder shaped like a catalog list row. */
export function SkeletonRow() {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-surface p-2.5">
      <Skeleton className="aspect-[4/3] w-[118px] flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-5 w-28 rounded-md" />
      </div>
    </div>
  );
}

/** Loading placeholder shaped like a horizontal unit card. */
export function SkeletonCard() {
  return (
    <div className="flex-[0_0_200px] overflow-hidden rounded-2xl border border-line bg-surface-3">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/** Corner status badge used on cards. */
export function Badge({ kind }: { kind: UnitBadge }) {
  if (!kind) return null;
  const styles: Record<NonNullable<UnitBadge>, string> = {
    "Baru masuk": "bg-surface text-teal-deep border border-teal-tint-border",
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
