import { useEffect, useRef, useState } from "react";
import { Calculator, Chat } from "./icons";

const ADMIN_PHONE = "6285701959826";

const DEFAULT_ADMIN_MESSAGE =
  "Halo Admin, mau tanya-tanya soal program agen Mobix dulu boleh? 🙏";

const DEFAULT_CALCULATION_MESSAGE =
  "saya mau minta hitungan leasing\n1. Dp minim\n2. Cicilan ringan\n3. Cair All in";

export function waHref(message: string) {
  return `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;
}

export function FloatingContactCta({
  adminMessage = DEFAULT_ADMIN_MESSAGE,
  calculationMessage = DEFAULT_CALCULATION_MESSAGE,
  bottomClassName = "bottom-[calc(12px+env(safe-area-inset-bottom))]",
}: {
  adminMessage?: string;
  calculationMessage?: string;
  bottomClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={[
        "fixed left-1/2 z-40 flex w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 flex-col items-end gap-2",
        bottomClassName,
      ].join(" ")}
    >
      {open && (
        <div className="w-[192px] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-nav">
          <a
            href={waHref(adminMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-teal-deep no-underline"
          >
            <Chat size={18} />
            Tanya Admin
          </a>
          <a
            href={waHref(calculationMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-teal-deep no-underline"
          >
            <Calculator size={18} />
            Minta Hitungan
          </a>
        </div>
      )}
      <button
        type="button"
        aria-label="Buka pilihan kontak"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-teal-tint-border bg-teal text-ink shadow-nav"
      >
        <Chat size={24} />
      </button>
    </div>
  );
}
