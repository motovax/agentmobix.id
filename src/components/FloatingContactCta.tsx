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
  return (
    <div
      className={[
        "fixed left-1/2 z-40 grid w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 grid-cols-[1fr_auto_1fr] items-center rounded-3xl border border-line bg-surface px-4 py-3 shadow-nav",
        bottomClassName,
      ].join(" ")}
    >
      <a
        href={waHref(adminMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-2 py-1.5 text-[14px] font-bold text-teal-deep no-underline"
      >
        <Chat size={22} />
        Tanya Admin
      </a>
      <div className="h-9 w-px bg-line" />
      <a
        href={waHref(calculationMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-2 py-1.5 text-[14px] font-bold text-teal-deep no-underline"
      >
        <Calculator size={22} />
        Minta Hitungan
      </a>
    </div>
  );
}
