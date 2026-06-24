import { Link } from "wouter";
import { ChevronLeft } from "./icons";

/** Sticky subpage app bar: circular back button + title + subtitle. */
export function AppBar({
  title,
  subtitle,
  back = "/",
}: {
  title: string;
  subtitle?: string;
  back?: string;
}) {
  return (
    <>
      <div className="fixed left-1/2 top-0 z-[9999] w-full max-w-[412px] -translate-x-1/2 flex items-center gap-3 border-b border-line-2 bg-surface-2/90 px-3.5 pb-3 pt-3 backdrop-blur-md">
        <Link
          href={back}
          aria-label="Kembali"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink"
        >
          <ChevronLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="-tracking-[0.01em] text-[16px] font-extrabold text-ink">{title}</div>
          {subtitle && <div className="text-[11px] text-muted">{subtitle}</div>}
        </div>
      </div>
      <div className={subtitle ? "h-16" : "h-12"} aria-hidden />
    </>
  );
}
