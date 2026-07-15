import { useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { ArrowRight, ChevronDown, Check, Info } from "../components/icons";

const CITIES = ["Bekasi", "Jakarta", "Bandung", "Surabaya", "Semarang"];
const BANKS = ["BCA", "Mandiri", "BRI", "BNI"];

export function DaftarAgen() {
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [city, setCity] = useState("Bekasi");
  const [bank, setBank] = useState("BCA");
  const [account, setAccount] = useState("");
  const [agree, setAgree] = useState(true);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agree) return;
    const message = [
      "Halo AI Mobix! Saya mau daftar jadi Agen Mobix 🙏",
      "",
      `Nama lengkap: ${name.trim()}`,
      `No. WhatsApp: +62 ${wa.trim()}`,
      `Kota domisili: ${city}`,
      `Rekening komisi: ${bank} ${account.trim()}`,
    ].join("\n");
    window.open(
      `https://wa.me/6285701959826?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener",
    );
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-surface-3 px-3.5 py-3 text-[14px] text-ink outline-none placeholder:text-placeholder";

  return (
    <AppShell>
      <AppBar title="Daftar jadi Agen" subtitle="Gratis · sekitar 2 menit" />

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5 px-4 pt-4">
        {/* benefit card */}
        <div className="flex items-center gap-3 rounded-[18px] bg-gradient-to-b from-ink to-ink-2 p-4 text-surface">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-[20px] font-extrabold text-ink">
            ★
          </div>
          <div>
            <div className="text-[14px] font-bold">Benefit agen Mobix</div>
            <div className="mt-0.5 text-[12px] leading-[1.4] text-[#A4D7D7]">
              Akses <span className="font-serif italic text-teal">CRM Dashboard</span>{" "}
              dan cek <span className="font-serif italic text-teal">Sales Insight</span>{" "}
              untuk pantau prospek &amp; penjualanmu.
            </div>
          </div>
        </div>

        {/* form card */}
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-[18px]">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-mid">
              Nama lengkap (sesuai KTP)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama sesuai KTP"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-mid">
              Nomor WhatsApp aktif
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-line bg-surface-3">
              <span className="border-r border-line bg-[#F0F2F3] px-3 py-3 text-[14px] font-semibold text-muted">
                +62
              </span>
              <input
                type="tel"
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                placeholder="812 3456 7890"
                required
                className="flex-1 bg-transparent px-3.5 py-3 text-[14px] text-ink outline-none placeholder:text-placeholder"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-mid">
              Kota domisili
            </label>
            <div className="relative">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${inputCls} appearance-none`}
              >
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>

          {/* Rekening */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-mid">
              Rekening pencairan komisi
            </label>
            <div className="flex gap-2">
              <div className="relative w-[108px]">
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-line bg-surface-3 px-3 py-3 text-[14px] text-ink outline-none"
                >
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
              </div>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="Nomor rekening"
                required
                className="flex-1 rounded-xl border border-line bg-surface-3 px-3.5 py-3 text-[14px] text-ink outline-none placeholder:text-placeholder"
              />
            </div>
          </div>

          {/* terms */}
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`mt-px flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[7px] ${
                agree ? "bg-teal text-ink" : "border border-line bg-surface"
              }`}
            >
              {agree && <Check size={12} />}
            </span>
            <span className="text-[12px] leading-[1.5] text-muted">
              Saya setuju dengan{" "}
              <span className="font-semibold text-teal-deep">syarat keagenan</span> dan
              kebijakan privasi Mobix.
            </span>
          </label>
        </div>

        {/* info note */}
        <div className="flex items-center gap-2 px-1 text-[12px] text-muted">
          <Info className="flex-shrink-0" />
          Data kamu hanya dipakai untuk verifikasi &amp; pencairan komisi.
        </div>

        <div className="h-[96px]" />

        {/* sticky submit (inside form so Enter submits) */}
        <div className="sticky bottom-0 left-0 right-0 z-30 -mx-4 border-t border-line-2 bg-surface-2/95 px-4 py-3.5 backdrop-blur-md">
          <button
            type="submit"
            disabled={!agree}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-ink px-3.5 py-[15px] text-[15px] font-bold text-surface disabled:opacity-60"
          >
            Aktifkan akun agen saya
            <ArrowRight />
          </button>
        </div>
      </form>
    </AppShell>
  );
}
