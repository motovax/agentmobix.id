import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { AppBar } from "../components/AppBar";
import { AppShell } from "../components/AppShell";
import { Camera, ChevronDown, Sparkles } from "../components/icons";
import {
  buildSellCarResult,
  fetchSellCarData,
  getBrands,
  getYears,
  type SellCarData,
  type SellCarFormData,
} from "../lib/sellCar";

const INITIAL_FORM: SellCarFormData = {
  brand: "",
  model: "",
  year: "",
  variant: "",
  transmission: "",
  color: "",
  mileage: "",
  plate: "",
  stnk: "",
};

const PLATES = ["B - DKI Jakarta", "D - Bandung", "F - Bogor", "L - Surabaya", "AB - Yogyakarta", "Lainnya"];
const COLORS = ["Hitam", "Putih", "Abu-abu", "Silver", "Merah", "Biru", "Cokelat", "Lainnya"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
}

function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-ink">
        {label} {required && <span className="text-[#E36356]">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-[1.4] text-muted">{hint}</span>}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  placeholder,
  disabled = false,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-full appearance-none rounded-[12px] border border-line bg-surface px-3.5 pr-9 text-[13px] text-ink outline-none transition focus:border-teal-deep disabled:bg-field disabled:text-placeholder"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

function MonthYearPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const initialYear = Number(value.slice(0, 4)) || new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialYear);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  function selectMonth(month: number) {
    onChange(`${viewYear}-${String(month + 1).padStart(2, "0")}`);
    setOpen(false);
  }

  const selectedYear = Number(value.slice(0, 4));
  const selectedMonth = Number(value.slice(5, 7)) - 1;
  const label = value
    ? `${MONTHS[selectedMonth] ?? ""} ${selectedYear}`
    : placeholder;

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setViewYear(Number(value.slice(0, 4)) || new Date().getFullYear());
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-11 w-full items-center justify-between rounded-[12px] border bg-surface px-3.5 text-left text-[13px] outline-none transition focus:border-teal-deep ${
          value ? "border-line text-ink" : "border-line text-placeholder"
        }`}
      >
        <span>{label}</span>
        <ChevronDown className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="dialog" aria-label="Pilih bulan dan tahun" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-[16px] border border-line bg-surface p-3 shadow-[0_12px_30px_-14px_rgba(14,27,30,0.4)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((year) => year - 1)}
              aria-label="Tahun sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[22px] leading-none text-ink transition hover:bg-field"
            >
              ‹
            </button>
            <div className="text-[14px] font-extrabold text-ink">{viewYear}</div>
            <button
              type="button"
              onClick={() => setViewYear((year) => year + 1)}
              aria-label="Tahun berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[22px] leading-none text-ink transition hover:bg-field"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((month, index) => {
              const active = selectedYear === viewYear && selectedMonth === index;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => selectMonth(index)}
                  className={`rounded-[10px] px-1.5 py-2 text-[11px] font-semibold transition ${
                    active ? "bg-teal-deep text-white" : "text-mid hover:bg-teal-tint"
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function JualMobil() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<SellCarData | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState<"form" | "ai">("form");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSellCarData()
      .then(setData)
      .catch(() => setError("Matrix harga belum dapat dimuat. Coba refresh halaman."))
      .finally(() => setLoading(false));
  }, []);

  const brands = useMemo(() => (data ? getBrands(data.rows) : []), [data]);
  const modelOptions = useMemo(() => {
    if (!data) return [];
    return data.rows
      .filter((row) => !form.brand || row.brand === form.brand)
      .filter((row, index, rows) => rows.findIndex((item) => item.model === row.model && item.variant === row.variant) === index)
      .sort((a, b) => `${a.model} ${a.variant}`.localeCompare(`${b.model} ${b.variant}`));
  }, [data, form.brand]);
  const years = useMemo(
    () => (data ? getYears(data.rows, form.brand, form.model, form.variant) : []),
    [data, form.brand, form.model, form.variant],
  );

  function update<K extends keyof SellCarFormData>(key: K, value: SellCarFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const result = buildSellCarResult(data, form);
    if (!result) {
      setError("Data mobil belum memiliki harga di matrix. Silakan pilih kombinasi lain.");
      return;
    }
    sessionStorage.setItem("mobix-sell-car-result", JSON.stringify(result));
    navigate("/jual-mobil/hasil");
  }

  return (
    <AppShell>
      <AppBar title="Jual Mobil" subtitle="Prediksi harga mobil Anda" />
      <main className="px-3.5 pb-8">
        <section className="rounded-[22px] border border-line bg-surface p-[18px] shadow-sm">
          <div className="mb-5">
            <div className="mb-1 text-[12px] font-medium text-teal-deep">Cek harga mobil</div>
            <h1 className="m-0 text-[22px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink">
              Mulai Jual Mobil Anda
            </h1>
            <p className="m-0 mt-2 text-[12px] leading-[1.5] text-muted">
              Isi data kendaraan untuk mendapatkan prediksi harga terbaik dari Mobix.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-[14px] border border-line bg-field p-1">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              aria-pressed={activeTab === "form"}
              className={`flex h-10 items-center justify-center rounded-[10px] text-[12px] font-extrabold transition ${
                activeTab === "form" ? "bg-surface text-teal-deep shadow-sm" : "text-muted"
              }`}
            >
              Isi Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              aria-pressed={activeTab === "ai"}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-extrabold transition ${
                activeTab === "ai" ? "bg-surface text-teal-deep shadow-sm" : "text-muted"
              }`}
            >
              Bantuan AI
              <span className="rounded-full bg-teal-tint px-1.5 py-0.5 text-[8px] font-extrabold uppercase leading-none text-teal-deep">
                Soon
              </span>
            </button>
          </div>

          {activeTab === "form" ? (
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="Merek" required>
                <SelectField
                  value={form.brand}
                  onChange={(value) => setForm({ ...INITIAL_FORM, brand: value })}
                  placeholder={loading ? "Memuat merek..." : "Pilih atau cari merek..."}
                  disabled={loading}
                >
                  {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </SelectField>
              </Field>

              <Field label="Model" required>
                <SelectField
                  value={form.model && form.variant ? `${form.model}|${form.variant}` : ""}
                  onChange={(value) => {
                    const [model, variant] = value.split("|");
                    setForm((current) => ({ ...current, model: model ?? "", variant: variant ?? "", year: "" }));
                  }}
                  placeholder="Pilih merek terlebih dahulu"
                  disabled={!form.brand}
                >
                  {modelOptions.map((option) => (
                    <option key={`${option.model}|${option.variant}`} value={`${option.model}|${option.variant}`}>
                      {option.model} - {option.variant}
                    </option>
                  ))}
                </SelectField>
              </Field>

              <Field label="Tahun Pabrik" required hint="Tahun mobil tersebut diproduksi.">
                <SelectField
                  value={form.year}
                  onChange={(value) => update("year", value)}
                  placeholder="Pilih tahun pabrik"
                  disabled={!form.variant}
                >
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </SelectField>
              </Field>

              <Field label="Transmisi" required>
                <SelectField value={form.transmission} onChange={(value) => update("transmission", value)} placeholder="Pilih transmisi...">
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </SelectField>
              </Field>

              <Field label="Warna" required hint="Pilih warna atau gunakan input manual jika tidak tersedia.">
                <SelectField value={form.color} onChange={(value) => update("color", value)} placeholder="Pilih warna">
                  {COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
                </SelectField>
              </Field>

              <Field label="Jarak Tempuh (KM)" hint="Contoh: 50.000">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatThousands(form.mileage)}
                  onChange={(event) => update("mileage", event.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 50.000"
                  className="h-11 w-full rounded-[12px] border border-line bg-surface px-3.5 text-[13px] text-ink outline-none transition placeholder:text-placeholder focus:border-teal-deep"
                />
              </Field>

              <Field label="Plat" required hint="Bisa dicek melalui kode provinsi pada plat kendaraan.">
                <SelectField value={form.plate} onChange={(value) => update("plate", value)} placeholder="Pilih plat">
                  {PLATES.map((plate) => <option key={plate} value={plate}>{plate}</option>)}
                </SelectField>
              </Field>

              <Field label="Masa Berlaku STNK" hint="Pilih bulan dan tahun masa berlaku STNK.">
                <MonthYearPicker
                  value={form.stnk}
                  onChange={(value) => update("stnk", value)}
                  placeholder="Pilih bulan dan tahun"
                />
              </Field>

              {error && <div className="rounded-[12px] bg-danger-bg px-3 py-2.5 text-[11px] leading-[1.45] text-danger">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-[12px] bg-teal-deep text-[14px] font-extrabold text-white transition hover:bg-[#078e8b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prediksi Harga Mobil Anda!
              </button>
            </form>
          ) : (
            <section className="rounded-[18px] border border-teal-tint-border bg-teal-tint p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-surface text-teal-deep">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="mb-1 inline-flex rounded-full bg-surface px-2 py-1 text-[10px] font-extrabold uppercase text-teal-deep">
                    Coming Soon
                  </div>
                  <h2 className="m-0 text-[18px] font-extrabold leading-[1.25] text-ink">
                    AIFalcon bantu hitungkan harga
                  </h2>
                  <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-muted">
                    Nanti cukup foto kendaraan dan STNK. AIFalcon akan membaca detail mobil lalu membuat estimasi harga secara otomatis.
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5">
                {["Foto kendaraan", "Foto STNK"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    className="flex h-14 w-full items-center gap-3 rounded-[14px] border border-dashed border-teal-tint-border bg-surface/70 px-3 text-left text-[12px] font-bold text-mid disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] bg-field text-teal-deep">
                      <Camera size={18} />
                    </span>
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] font-extrabold uppercase text-placeholder">Soon</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>

        <Link href="/" className="mt-4 block text-center text-[12px] font-semibold text-muted no-underline">
          Kembali ke Beranda
        </Link>
      </main>
    </AppShell>
  );
}
