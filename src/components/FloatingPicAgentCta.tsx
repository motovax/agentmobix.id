import { WhatsAppSolid } from "./icons";
import { buildPicAgentWhatsAppHref } from "../lib/picAgent";

type PicAgentUnit = {
  nama?: string | null;
  plate_no?: string | null;
};

export function FloatingPicAgentCta({ unit }: { unit?: PicAgentUnit | null }) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 justify-end">
      <a
        href={buildPicAgentWhatsAppHref(unit)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Diskusi dengan PIC Agent Wella melalui WhatsApp"
        className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full border border-white/70 bg-whatsapp px-4 py-2.5 text-[13px] font-bold text-white no-underline shadow-wa transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-whatsapp active:translate-y-0"
      >
        <WhatsAppSolid size={21} />
        <span>Diskusi dengan PIC</span>
      </a>
    </div>
  );
}
