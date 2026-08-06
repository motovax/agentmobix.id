import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { Camera, Calculator, Chat, ChevronLeft, Plus, Search, Send, VideoCamera } from "../components/icons";
import { askFalcon } from "../lib/falcon";

type Message =
  | { id: number; kind: "in"; html: string; photos?: Array<{ url: string; label?: string }> }
  | { id: number; kind: "out"; html: string };

const SEED: Message[] = [
  {
    id: 1,
    kind: "in",
    html: "Halo 👋 Aku Falcon Jr, asisten jualanmu. Aku bisa bantu mencari unit di inventory Mobix, membuat caption, atau menghitung paket cicilan. Silakan tanyakan apa saja.",
  },
];

type QuickAction = {
  label: string;
  prompt: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Cari unit", prompt: "Cari unit: ", Icon: Search },
  { label: "Minta foto", prompt: "Minta foto unit: ", Icon: Camera },
  { label: "Minta video", prompt: "Minta video unit: ", Icon: VideoCamera },
  { label: "Hitung cicilan", prompt: "Hitung cicilan unit: ", Icon: Calculator },
  { label: "Estafet lead", prompt: "Estafet lead: ", Icon: Chat },
];

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function falconHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

export function AiMobix() {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [draft, setDraft] = useState("");
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);
  const nextId = useRef(100);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || isSearchingInventory) return;
    const outId = nextId.current++;
    setMessages((m) => [...m, { id: outId, kind: "out", html: value }]);
    setDraft("");

    setIsSearchingInventory(true);
    try {
      const result = await askFalcon(value);
      setMessages((m) => [...m, {
        id: nextId.current++,
        kind: "in",
        html: falconHtml(result.reply),
        photos: result.photos,
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: nextId.current++,
        kind: "in",
        html: "Falcon sedang tidak dapat diakses. Coba lagi beberapa saat atau buka katalog untuk melihat stok terbaru.",
      }]);
    } finally {
      setIsSearchingInventory(false);
    }
  }

  return (
    <AppShell bg="bg-surface-2" flexColumn>
      {/* header */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#EEF2F3] bg-surface px-3.5 pb-3.5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link
          href="/"
          aria-label="Kembali"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink no-underline"
        >
          <ChevronLeft />
        </Link>
        <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[13px] bg-ink text-[17px] font-extrabold text-teal">
          T
        </div>
        <div className="flex-1">
          <div className="-tracking-[0.01em] text-[15px] font-extrabold">Falcon Jr</div>
          <div className="flex items-center gap-1.5 text-[11px] text-teal-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Aktif · biasanya balas &lt; 30 detik
          </div>
        </div>
      </div>

      {/* messages */}
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-surface-2 px-3.5 py-4"
      >
        <div className="mb-0.5 text-center text-[11px] text-placeholder">
          Hari ini · 19.18
        </div>
        {messages.map((m) => {
          if (m.kind === "in") {
            return (
              <div key={m.id} className="max-w-[86%] break-words self-start rounded-[16px_16px_16px_5px] border border-[#EEF2F3] bg-surface px-3.5 py-3 text-[13px] leading-[1.5] text-ink">
                <div dangerouslySetInnerHTML={{ __html: m.html }} />
                {m.photos?.map((photo) => (
                  <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="mt-2 block text-teal-deep underline">
                    {photo.label || "Lihat foto unit"}
                  </a>
                ))}
              </div>
            );
          }
          if (m.kind === "out") {
            return (
              <div
                key={m.id}
                className="max-w-[82%] break-words self-end rounded-[16px_16px_5px_16px] bg-ink px-3.5 py-3 text-[13px] leading-[1.5] text-surface"
                dangerouslySetInnerHTML={{ __html: m.html }}
              />
            );
          }
        })}
        {isSearchingInventory && (
          <div className="max-w-[86%] break-words self-start rounded-[16px_16px_16px_5px] border border-[#EEF2F3] bg-surface px-3.5 py-3 text-[13px] text-muted">
            Falcon Jr sedang mengecek inventory Motovax…
          </div>
        )}
      </div>

      {/* quick actions + input */}
      <div className="flex-shrink-0 border-t border-[#EEF2F3] bg-surface px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
        <div className="scroll-x mb-1.5 flex gap-2 overflow-x-auto pb-0.5">
          {QUICK_ACTIONS.map(({ label, prompt, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setDraft(prompt);
                window.requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12px] font-bold text-mid transition-colors hover:border-teal-tint-border hover:bg-teal-tint hover:text-teal-deep"
            >
              <Icon size={16} className="text-teal-deep" strokeWidth={1.7} />
              {label}
            </button>
          ))}
        </div>
        <div className="mb-2 text-[10.5px] text-muted">
          Pilih bantuan, lalu lengkapi detail unit setelah tanda “:”.
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
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tulis pesan untuk Falcon Jr…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-placeholder"
            />
          </div>
          <button
            type="submit"
            aria-label="Kirim"
            disabled={isSearchingInventory}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
