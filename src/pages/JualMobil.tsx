import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { AppBar } from "../components/AppBar";
import { AppShell } from "../components/AppShell";
import { Camera, Check, ChevronDown, Sparkles } from "../components/icons";
import {
  applySellCarAIExtraction,
  fetchSellCarAIExtraction,
  fetchSellCarQuote,
  fetchSellCarData,
  getBrands,
  getYears,
  type SellCarAIExtraction,
  type SellCarAIPhotoKind,
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

type AIPhotoSelection = { file: File; previewUrl: string };

const AI_PHOTO_INPUTS: Array<{
  kind: SellCarAIPhotoKind;
  label: string;
  hint: string;
}> = [
  { kind: "vehicle", label: "Foto kendaraan", hint: "Tampak luar, terang, dan seluruh mobil terlihat" },
  { kind: "stnk", label: "Foto STNK", hint: "Pastikan data kendaraan dan masa berlaku terbaca" },
  { kind: "odometer", label: "Foto KM mobil", hint: "Foto panel odometer dari arah depan" },
];

const AI_REVIEW_LABELS: Record<string, string> = {
  brand: "merek",
  model: "model",
  variant: "varian",
  year: "tahun",
  transmission: "transmisi",
  color: "warna",
  mileage: "kilometer",
  plate: "plat",
  stnk: "masa berlaku STNK",
};

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

function AIPhotoField({
  item,
  selection,
  disabled,
  onSelect,
}: {
  item: (typeof AI_PHOTO_INPUTS)[number];
  selection?: AIPhotoSelection;
  disabled: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <label
      className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition ${
        selection
          ? "border-teal-tint-border bg-surface"
          : "border-dashed border-teal-tint-border bg-surface/70"
      } ${disabled ? "pointer-events-none opacity-60" : "hover:border-teal-deep"}`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
      {selection ? (
        <img
          src={selection.previewUrl}
          alt=""
          className="h-11 w-11 flex-shrink-0 rounded-[10px] bg-field object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-field text-teal-deep">
          <Camera size={19} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold text-mid">{item.label}</span>
        <span className="mt-0.5 block text-[10px] leading-[1.35] text-muted">
          {selection ? selection.file.name : item.hint}
        </span>
      </span>
      {selection && (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-tint text-teal-deep">
          <Check size={13} />
        </span>
      )}
    </label>
  );
}

export function JualMobil() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<SellCarData | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState<"form" | "ai">("form");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aiPhotos, setAIPhotos] = useState<Partial<Record<SellCarAIPhotoKind, AIPhotoSelection>>>({});
  const aiPhotosRef = useRef(aiPhotos);
  const [aiAnalyzing, setAIAnalyzing] = useState(false);
  const [aiError, setAIError] = useState("");
  const [aiReview, setAIReview] = useState<SellCarAIExtraction | null>(null);
  const [stnkConsent, setStnkConsent] = useState(false);

  useEffect(() => {
    aiPhotosRef.current = aiPhotos;
  }, [aiPhotos]);

  useEffect(() => () => {
    Object.values(aiPhotosRef.current).forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }, []);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await fetchSellCarQuote(form);
      sessionStorage.setItem("mobix-sell-car-result", JSON.stringify(result));
      navigate("/jual-mobil/hasil");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghitung harga mobil.");
    } finally {
      setSubmitting(false);
    }
  }

  function selectAIPhoto(kind: SellCarAIPhotoKind, file: File) {
    if (kind === "stnk" && !stnkConsent) {
      setAIError("Setujui pemrosesan foto STNK sebelum mengunggah foto.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setAIError("Ukuran satu foto maksimal 12 MB.");
      return;
    }
    setAIError("");
    setAIPhotos((current) => {
      const previous = current[kind];
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return {
        ...current,
        [kind]: { file, previewUrl: URL.createObjectURL(file) },
      };
    });
  }

  async function analyzeWithAI() {
    if (aiAnalyzing) return;
    if (!data) {
      setAIError("Matrix harga belum tersedia. Refresh halaman lalu coba lagi.");
      return;
    }
    if (!stnkConsent) {
      setAIError("Persetujuan pemrosesan foto STNK diperlukan untuk melanjutkan.");
      return;
    }
    const vehicle = aiPhotos.vehicle?.file;
    const stnk = aiPhotos.stnk?.file;
    const odometer = aiPhotos.odometer?.file;
    if (!vehicle || !stnk || !odometer) {
      setAIError("Lengkapi ketiga foto agar AIFalcon dapat membaca data kendaraan.");
      return;
    }
    setAIError("");
    setAIAnalyzing(true);
    try {
      const result = await fetchSellCarAIExtraction({ vehicle, stnk, odometer });
      setForm((current) => applySellCarAIExtraction(current, result, data.rows));
      setAIReview(result);
      setError("");
      setActiveTab("form");
    } catch (cause) {
      setAIError(cause instanceof Error ? cause.message : "AIFalcon belum dapat membaca foto.");
    } finally {
      setAIAnalyzing(false);
    }
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
              <Sparkles size={13} />
            </button>
          </div>

          {activeTab === "form" ? (
            <form onSubmit={submit} className="space-y-3.5">
              {aiReview && (
                <div className="rounded-[14px] border border-teal-tint-border bg-teal-tint px-3.5 py-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface text-teal-deep">
                      <Sparkles size={15} />
                    </span>
                    <div>
                      <div className="text-[12px] font-extrabold text-ink">Data berhasil dibaca AIFalcon</div>
                      <p className="m-0 mt-1 text-[10px] leading-[1.45] text-muted">
                        Periksa semua isian sebelum menghitung harga
                        {aiReview.needs_confirmation.length > 0 && (
                          <>, terutama {aiReview.needs_confirmation.map((key) => AI_REVIEW_LABELS[key] || key).join(", ")}.</>
                        )}
                      </p>
                      {aiReview.warnings.map((warning) => (
                        <p key={warning} className="m-0 mt-1 text-[10px] font-semibold leading-[1.4] text-[#8A6A17]">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
                disabled={loading || submitting}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-[12px] bg-teal-deep text-[14px] font-extrabold text-white transition hover:bg-[#078e8b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Menghitung harga..." : "Prediksi Harga Mobil Anda!"}
              </button>
            </form>
          ) : (
            <section className="rounded-[18px] border border-teal-tint-border bg-teal-tint p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-surface text-teal-deep">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="mb-1 inline-flex rounded-full bg-surface px-2 py-1 text-[10px] font-extrabold text-teal-deep">
                    Isi otomatis dari foto
                  </div>
                  <h2 className="m-0 text-[18px] font-extrabold leading-[1.25] text-ink">
                    AIFalcon bantu hitungkan harga
                  </h2>
                  <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-muted">
                    Unggah tiga foto. AIFalcon akan membaca data kendaraan, lalu Anda tetap dapat memeriksa dan mengubah hasilnya.
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-[14px] border border-[#E8D7A2] bg-[#FFF9E8] p-3">
                <div className="text-[11px] font-extrabold text-ink">Privasi foto STNK</div>
                <p className="m-0 mt-1 text-[10px] leading-[1.5] text-muted">
                  Foto STNK dapat memuat data pribadi. Anda dapat menutupi nama, alamat, nomor rangka, dan nomor mesin selama data kendaraan serta masa berlaku STNK tetap terbaca. Foto hanya digunakan AIFalcon untuk membaca data kendaraan; informasi pribadi tersebut tidak diambil ke hasil prediksi.
                </p>
                <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={stnkConsent}
                    disabled={aiAnalyzing}
                    onChange={(event) => {
                      const agreed = event.target.checked;
                      setStnkConsent(agreed);
                      setAIError("");
                      if (!agreed) {
                        setAIPhotos((current) => {
                          const stnkPhoto = current.stnk;
                          if (!stnkPhoto) return current;
                          URL.revokeObjectURL(stnkPhoto.previewUrl);
                          const remaining = { ...current };
                          delete remaining.stnk;
                          return remaining;
                        });
                      }
                    }}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-teal-deep"
                  />
                  <span className="text-[10px] font-semibold leading-[1.45] text-mid">
                    Saya memahami foto STNK berisi data pribadi dan menyetujui pemrosesannya untuk membaca data kendaraan serta membuat prediksi harga.
                  </span>
                </label>
                {!stnkConsent && (
                  <p className="m-0 mt-2 text-[10px] font-semibold leading-[1.4] text-[#8A6A17]">
                    Persetujuan diperlukan sebelum foto STNK dapat dipilih.
                  </p>
                )}
              </div>

              <div className="grid gap-2.5">
                {AI_PHOTO_INPUTS.map((item) => (
                  <AIPhotoField
                    key={item.kind}
                    item={item}
                    selection={aiPhotos[item.kind]}
                    disabled={aiAnalyzing || (item.kind === "stnk" && !stnkConsent)}
                    onSelect={(file) => selectAIPhoto(item.kind, file)}
                  />
                ))}
              </div>

              {aiError && (
                <div className="mt-3 rounded-[12px] bg-danger-bg px-3 py-2.5 text-[11px] leading-[1.45] text-danger">
                  {aiError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void analyzeWithAI()}
                disabled={aiAnalyzing || loading || !data || !stnkConsent || AI_PHOTO_INPUTS.some((item) => !aiPhotos[item.kind])}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-teal-deep text-[13px] font-extrabold text-white transition hover:bg-[#078e8b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={16} />
                {aiAnalyzing ? "AIFalcon sedang membaca foto..." : "Baca Data Kendaraan"}
              </button>
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
