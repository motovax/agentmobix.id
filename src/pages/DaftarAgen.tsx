import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { ArrowRight, ChevronDown, Check, Camera, Info } from "../components/icons";

const CITIES = ["Bekasi", "Jakarta", "Bandung", "Surabaya", "Semarang"];
const BANKS = ["BCA", "Mandiri", "BRI", "BNI"];

export function DaftarAgen() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("Rizky Maulana");
  const [wa, setWa] = useState("852 1100 2233");
  const [city, setCity] = useState("Bekasi");
  const [bank, setBank] = useState("BCA");
  const [account, setAccount] = useState("8830 1122 334");
  const [agree, setAgree] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agree) return;
    setSubmitted(true);
    window.setTimeout(() => navigate("/"), 1100);
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-surface-3 px-3.5 py-3 text-[14px] text-ink outline-none placeholder:text-placeholder";

  return (
    <AppShell>
      <AppBar title="Daftar jadi Agen" subtitle="Gratis · sekitar 2 menit" />

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5 px-4 pt-4">
        {/* progress */}
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-ink" />
          <div className="h-1 flex-1 rounded-full bg-ink" />
          <div className="h-1 flex-1 rounded-full bg-[#D4DEDF]" />
          <span className="ml-1 text-[11px] font-semibold text-muted">2/3</span>
        </div>

        {/* bonus card */}
        <div className="flex items-center gap-3 rounded-[18px] bg-gradient-to-b from-ink to-ink-2 p-4 text-surface">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-[20px] font-extrabold text-ink">
            ★
          </div>
          <div>
            <div className="text-[14px] font-bold">Bonus pendaftar minggu ini</div>
            <div className="mt-0.5 text-[12px] leading-[1.4] text-[#A4D7D7]">
              Starter pack{" "}
              <span className="font-serif italic text-teal">Rp 500 ribu</span> untuk
              iklan pertamamu.
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
                className="flex-1 bg-transparent px-3.5 py-3 text-[14px] text-ink outline-none"
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

          {/* KTP upload */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-mid">
              Foto KTP
            </label>
            <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-teal-tint-border bg-[#F2FCFB] p-[18px]">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-tint text-teal-deep">
                <Camera />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-ink">KTP_rizky.jpg</div>
                <div className="text-[11px] text-teal-deep">Terunggah · 1,2 MB</div>
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal text-ink">
                <Check />
              </div>
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
                className="flex-1 rounded-xl border border-line bg-surface-3 px-3.5 py-3 text-[14px] text-ink outline-none"
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
            {submitted ? "Akun agen aktif ✓" : "Aktifkan akun agen saya"}
            {!submitted && <ArrowRight />}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
