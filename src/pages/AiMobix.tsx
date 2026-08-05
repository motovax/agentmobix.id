import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "../components/AppShell";
import { ChevronLeft, Plus, Send } from "../components/icons";
import { classifyQuery, fetchUnits, type ProductListItem } from "../lib/mobix";
import { formatJt } from "../lib/format";

type Message =
  | { id: number; kind: "in"; html: string }
  | { id: number; kind: "out"; html: string };

const SEED: Message[] = [
  {
    id: 1,
    kind: "in",
    html: "Halo 👋 Aku Talon AI, asisten jualanmu. Aku bisa bantu mencari unit di inventory Motovax, membuat caption, atau menghitung paket cicilan. Silakan tanyakan apa saja.",
  },
];

const CHIPS = [
  "🔎 Cari inventory",
  "📸 Minta foto",
  "🎥 Video keliling",
  "🧮 Hitung paket",
  "↩ Estafet lead",
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

function isInventoryRequest(text: string) {
  return /inventory|stok|unit|cari|avanza|brio|xenia|sigra|mobil|matic|manual/i.test(text);
}

function inventoryRequest(text: string) {
  const query = text.replace(/^(cari|tampilkan|carikan|cek)\s+/i, "").trim();
  if (!query || /^(inventory|stok|unit)$/i.test(query)) return { page: 1, limit: 5 };
  const classification = classifyQuery(query);
  return { [classification.param]: classification.value, page: 1, limit: 5 };
}

function inventoryReply(items: ProductListItem[], total: number) {
  if (!items.length) return "Aku belum menemukan unit yang cocok di inventory Motovax. Coba sebutkan merek, model, atau nomor polisi.";
  const rows = items.map((item) => {
    const title = escapeHtml(item.nama);
    const branch = escapeHtml(item.cabang || "Lokasi belum tersedia");
    return `<a href="/unit/${encodeURIComponent(item.slug)}" class="font-bold text-teal-deep no-underline">${title}</a><br/><span class="text-muted">Rp ${formatJt(item.harga)} · ${item.year} · ${branch}</span>`;
  });
  return `<strong>${total} unit ditemukan di inventory Motovax.</strong><br/>${rows.join("<br/><br/>")}<br/><br/><span class="text-muted">Buka salah satu unit untuk melihat detail lengkapnya.</span>`;
}

export function AiMobix() {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [draft, setDraft] = useState("");
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);
  const nextId = useRef(100);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || isSearchingInventory) return;
    const outId = nextId.current++;
    setMessages((m) => [...m, { id: outId, kind: "out", html: value }]);
    setDraft("");

    if (isInventoryRequest(value)) {
      setIsSearchingInventory(true);
      try {
        const result = await fetchUnits(inventoryRequest(value));
        setMessages((m) => [...m, { id: nextId.current++, kind: "in", html: inventoryReply(result.items, result.total) }]);
      } catch {
        setMessages((m) => [...m, { id: nextId.current++, kind: "in", html: "Inventory sedang tidak dapat diakses. Coba lagi beberapa saat atau buka katalog untuk melihat stok terbaru." }]);
      } finally {
        setIsSearchingInventory(false);
      }
      return;
    }

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
          T
        </div>
        <div className="flex-1">
          <div className="-tracking-[0.01em] text-[15px] font-extrabold">Talon AI</div>
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
        })}
        {isSearchingInventory && (
          <div className="max-w-[86%] self-start rounded-[16px_16px_16px_5px] border border-[#EEF2F3] bg-surface px-3.5 py-3 text-[13px] text-muted">
            Talon AI sedang mengecek inventory Motovax…
          </div>
        )}
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
              placeholder="Tulis pesan untuk Talon AI…"
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
