import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { ChevronLeft, Plus, Send } from "../components/icons";
import { Photo } from "../components/ui";

type Message =
  | { id: number; kind: "in"; html: string }
  | { id: number; kind: "out"; html: string }
  | { id: number; kind: "photos"; caption: string }
  | { id: number; kind: "relay"; lead: string };

const SEED: Message[] = [
  {
    id: 1,
    kind: "in",
    html: "Halo Rizky 👋 Aku bantu kamu jualan. Bisa minta foto unit, bikin caption, hitung paket cicilan, atau sambungkan calon pembeli ke PIC cabang. Mau mulai dari mana?",
  },
  {
    id: 2,
    kind: "out",
    html: "Tolong fotoin Avanza A-10428 dari sisi kanan & dashboard ya",
  },
  {
    id: 3,
    kind: "in",
    html: "Siap! Aku teruskan ke tim cabang BSD. Perkiraan foto siap sekitar <strong>20 menit</strong>. Nanti aku kabari di sini.",
  },
  {
    id: 4,
    kind: "photos",
    caption:
      "2 foto baru sudah dilampirkan ke kartu unit. Mau aku buatkan caption juga?",
  },
  {
    id: 5,
    kind: "out",
    html: "Boleh. Terus estafetin ke PIC cabang dong, calon mau survei besok",
  },
  { id: 6, kind: "relay", lead: "Bu Sinta · Cabang BSD" },
];

const CHIPS = [
  "📸 Minta foto",
  "🎥 Video keliling",
  "🧮 Hitung paket",
  "↩ Estafet lead",
];

export function AiMobix() {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [draft, setDraft] = useState("");
  const nextId = useRef(100);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    const outId = nextId.current++;
    setMessages((m) => [...m, { id: outId, kind: "out", html: value }]);
    setDraft("");
    const inId = nextId.current++;
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: inId,
          kind: "in",
          html: "Siap, aku bantu proses. Aku teruskan ke tim cabang dan kabari kamu di sini ya. 🙌",
        },
      ]);
    }, 700);
  }

  return (
    <AppShell bg="bg-surface-2" flexColumn>
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[#EEF2F3] bg-surface px-3.5 pb-3.5 pt-3">
        <Link
          href="/"
          aria-label="Kembali"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink no-underline"
        >
          <ChevronLeft />
        </Link>
        <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[13px] bg-ink text-[17px] font-extrabold text-teal">
          M
        </div>
        <div className="flex-1">
          <div className="-tracking-[0.01em] text-[15px] font-extrabold">AI Mobix</div>
          <div className="flex items-center gap-1.5 text-[11px] text-teal-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Aktif · biasanya balas &lt; 30 detik
          </div>
        </div>
      </div>

      {/* messages */}
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-surface-2 px-3.5 py-4"
      >
        <div className="mb-0.5 text-center text-[11px] text-placeholder">
          Hari ini · 19.18
        </div>
        {messages.map((m) => {
          if (m.kind === "in") {
            return (
              <div
                key={m.id}
                className="max-w-[86%] self-start rounded-[16px_16px_16px_5px] border border-[#EEF2F3] bg-surface px-3.5 py-3 text-[13px] leading-[1.5] text-ink"
                dangerouslySetInnerHTML={{ __html: m.html }}
              />
            );
          }
          if (m.kind === "out") {
            return (
              <div
                key={m.id}
                className="max-w-[82%] self-end rounded-[16px_16px_5px_16px] bg-ink px-3.5 py-3 text-[13px] leading-[1.5] text-surface"
                dangerouslySetInnerHTML={{ __html: m.html }}
              />
            );
          }
          if (m.kind === "photos") {
            return (
              <div
                key={m.id}
                className="max-w-[86%] self-start overflow-hidden rounded-[16px_16px_16px_5px] border border-[#EEF2F3] bg-surface"
              >
                <div className="grid grid-cols-2 gap-[3px] p-[3px]">
                  <Photo className="aspect-square rounded-[10px]" />
                  <Photo className="aspect-square rounded-[10px]" />
                </div>
                <div className="px-3.5 pb-3 pt-2 text-[12px] text-muted">
                  {m.caption}
                </div>
              </div>
            );
          }
          // relay card
          return (
            <div
              key={m.id}
              className="max-w-[86%] self-start rounded-[16px_16px_16px_5px] border border-[#EEF2F3] bg-surface px-3.5 py-3 text-[13px] leading-[1.5] text-ink"
            >
              Sudah aku teruskan ke <strong>Bu Sinta (PIC BSD)</strong> ✓
              <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-field p-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-deep text-[12px] font-extrabold text-ink">
                  SN
                </span>
                <div className="flex-1">
                  <div className="text-[12px] font-bold">{m.lead}</div>
                  <div className="text-[11px] text-muted">Sedang mengetik balasan…</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* quick actions + input */}
      <div className="border-t border-[#EEF2F3] bg-surface px-3 pb-3 pt-2.5">
        <div className="scroll-x mb-2.5 flex gap-[7px] overflow-x-auto">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setDraft(chip.replace(/^[^\s]+\s/, ""))}
              className="whitespace-nowrap rounded-full border border-line bg-surface-2 px-3 py-[7px] text-[12px] font-semibold text-mid"
            >
              {chip}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            aria-label="Lampirkan"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-muted"
          >
            <Plus />
          </button>
          <div className="flex flex-1 items-center rounded-full border border-line bg-surface-2 px-4 py-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tulis pesan untuk AI Mobix…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-placeholder"
            />
          </div>
          <button
            type="submit"
            aria-label="Kirim"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-surface"
          >
            <Send />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
