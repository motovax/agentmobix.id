import { WhatsAppSolid } from "./icons";
import { buildPicAgentWhatsAppHref } from "../lib/picAgent";

type PicAgentUnit = {
  nama?: string | null;
  plate_no?: string | null;
};

export function FloatingPicAgentCta({ unit }: { unit?: PicAgentUnit | null }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-[55%] z-40 flex w-[calc(100%-28px)] max-w-[384px] -translate-x-1/2 -translate-y-1/2 justify-end">
      <a
        href={buildPicAgentWhatsAppHref(unit)}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby="pic-agent-tooltip"
        aria-label="Diskusi dengan PIC Agent Wella melalui WhatsApp"
        className="group pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/90 bg-whatsapp text-white no-underline shadow-wa transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-whatsapp active:scale-95"
      >
        <WhatsAppSolid size={28} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1.5 -top-2 rounded-full border-2 border-white bg-ink px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-wide text-white"
        >
          PIC
        </span>
        <span
          id="pic-agent-tooltip"
          role="tooltip"
          className="pointer-events-none invisible absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-[11px] font-bold text-white opacity-0 shadow-nav transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
        >
          Chat dengan PIC Agent
        </span>
      </a>
    </div>
  );
}
