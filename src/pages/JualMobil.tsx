import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { AppBar } from "../components/AppBar";
import { AppShell } from "../components/AppShell";
import { Camera, Check, ChevronDown, Image, Sparkles } from "../components/icons";
import {
  applySellCarAIExtraction,
  fetchSellCarAIExtraction,
  fetchSellCarQuote,
  fetchSellCarData,
  getBrands,
  getYears,
  searchVehicleColors,
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
  ownershipType: "",
  plate: "",
  stnk: "",
};

const PLATES = ["B - DKI Jakarta", "D - Bandung", "F - Bogor", "L - Surabaya", "AB - Yogyakarta", "Lainnya"];
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

const AI_PHOTO_ACCEPT =
  "image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

const AI_PHOTO_INPUTS: Array<{
  kind: SellCarAIPhotoKind;
  label: string;
  hint: string;
}> = [
  { kind: "vehicle", label: "Foto kendaraan", hint: "Tampak luar, terang, dan seluruh mobil terlihat" },
  { kind: "stnk", label: "Foto STNK", hint: "Pastikan data kendaraan dan masa berlaku terbaca" },
  { kind: "odometer", label: "Foto KM mobil", hint: "Foto panel odometer dari arah depan" },
];

function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  // Beberapa device (Android/iOS) mengirim type kosong dari galeri.
  return /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name);
}

/** Deteksi smartphone: pilihan Kamera/Galeri hanya di HP, bukan desktop/laptop. */
function useIsSmartphone(): boolean {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches
      || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px) and (pointer: coarse)");
    const update = () => {
      setIsPhone(
        media.matches || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent),
      );
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isPhone;
}

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
  required = false,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="h-11 w-full appearance-none rounded-[12px] border border-line bg-surface px-3.5 pr-9 text-[13px] text-ink outline-none transition focus:border-teal-deep disabled:bg-field disabled:text-placeholder"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

function ColorCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const hasMinimumQuery = [...query.trim()].length >= 3;

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  useEffect(() => {
    if (!open || !hasMinimumQuery) {
      setOptions([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setSearchError("");
    setActiveIndex(0);
    searchVehicleColors(query, controller.signal)
      .then((colors) => setOptions(colors))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOptions([]);
        setSearchError(error instanceof Error ? error.message : "Gagal mencari warna kendaraan");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hasMinimumQuery, open, query]);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, [open]);

  function selectColor(color: string) {
    onChange(color);
    setQuery(color);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-busy={loading}
        aria-required="true"
        autoComplete="off"
        value={open ? query : value}
        onFocus={() => {
          setQuery(value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
          if (event.target.value !== value) onChange("");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && open && options[activeIndex]) {
            event.preventDefault();
            selectColor(options[activeIndex]);
          } else if (event.key === "Escape") {
            setQuery(value);
            setOpen(false);
          } else if (event.key === "Tab") {
            setOpen(false);
          }
        }}
        placeholder="Ketik minimal 3 karakter"
        className="h-11 w-full rounded-[12px] border border-line bg-surface px-3.5 pr-9 text-[13px] text-ink outline-none transition placeholder:text-placeholder focus:border-teal-deep"
      />
      <button
        type="button"
        aria-label={open ? "Tutup pilihan warna" : "Buka pilihan warna"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setQuery(value);
          setActiveIndex(0);
          setOpen((current) => !current);
          inputRef.current?.focus();
        }}
        className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-muted"
      >
        <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-[12px] border border-line bg-surface p-1.5 shadow-[0_12px_30px_rgba(14,27,30,0.16)]"
        >
          {!hasMinimumQuery ? (
            <p className="px-3 py-4 text-center text-[12px] text-muted">
              Ketik minimal 3 karakter untuk mencari warna.
            </p>
          ) : loading ? (
            <p className="px-3 py-4 text-center text-[12px] text-muted">Mencari warna...</p>
          ) : searchError ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#B84E43]">{searchError}</p>
          ) : options.length > 0 ? options.map((color, index) => (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={value === color}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectColor(color)}
              className={`flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left text-[13px] transition-colors ${
                index === activeIndex ? "bg-teal-deep/10 text-teal-deep" : "text-ink hover:bg-field"
              }`}
            >
              <span>{color}</span>
              {value === color && <Check size={15} className="shrink-0 text-teal-deep" />}
            </button>
          )) : (
            <p className="px-3 py-4 text-center text-[12px] text-muted">Warna tidak ditemukan.</p>
          )}
        </div>
      )}
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

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
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
    <div className="relative">
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

      {/* Portal + fixed overlay: lepas dari overflow-hidden AppShell agar tidak terpotong */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 p-3 sm:items-center"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pilih bulan dan tahun"
              className="w-full max-w-sm rounded-[18px] border border-line bg-surface p-4 shadow-[0_16px_40px_-12px_rgba(14,27,30,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
                <div>
                  <div className="text-[13px] font-extrabold text-ink">Masa Berlaku STNK</div>
                  <p className="m-0 mt-0.5 text-[11px] leading-[1.4] text-muted">Pilih bulan dan tahun</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none text-muted transition hover:bg-field hover:text-ink"
                >
                  ×
                </button>
              </div>
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewYear((year) => year - 1)}
                  aria-label="Tahun sebelumnya"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[22px] leading-none text-ink transition hover:bg-field"
                >
                  ‹
                </button>
                <div className="text-[16px] font-extrabold text-ink">{viewYear}</div>
                <button
                  type="button"
                  onClick={() => setViewYear((year) => year + 1)}
                  aria-label="Tahun berikutnya"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[22px] leading-none text-ink transition hover:bg-field"
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => {
                  const active = selectedYear === viewYear && selectedMonth === index;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => selectMonth(index)}
                      className={`rounded-[12px] px-2 py-2.5 text-[12px] font-semibold transition ${
                        active ? "bg-teal-deep text-white" : "bg-field text-mid hover:bg-teal-tint"
                      }`}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
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
  const isPhone = useIsSmartphone();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setSheetOpen(false);
    if (file) onSelect(file);
  }

  function openSource(source: "gallery" | "camera") {
    // Klik input sinkron di dalam handler agar iOS/Android tetap anggap user gesture.
    if (source === "camera") cameraInputRef.current?.click();
    else galleryInputRef.current?.click();
    setSheetOpen(false);
  }

  const shellClass = `flex min-h-16 w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition ${
    selection
      ? "border-teal-tint-border bg-surface"
      : "border-dashed border-teal-tint-border bg-surface/70"
  } ${disabled ? "pointer-events-none opacity-60" : "cursor-pointer hover:border-teal-deep"}`;

  const preview = (
    <>
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
    </>
  );

  // Desktop/laptop: 1 klik → file lokal (tanpa sheet, tanpa capture).
  if (!isPhone) {
    return (
      <label className={shellClass}>
        <input
          type="file"
          accept={AI_PHOTO_ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={handleFileChange}
        />
        {preview}
      </label>
    );
  }

  // Smartphone: 1 ketuk → pilih Kamera atau Galeri (input terpisah; browser HP tidak selalu gabung keduanya).
  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept={AI_PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={AI_PHOTO_ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setSheetOpen(true)}
        className={shellClass}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
      >
        {preview}
      </button>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="presentation"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-label={`Pilih sumber ${item.label}`}
            className="w-full max-w-sm overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_16px_40px_-12px_rgba(14,27,30,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-line px-4 py-3">
              <div className="text-[13px] font-extrabold text-ink">{item.label}</div>
              <p className="m-0 mt-0.5 text-[11px] leading-[1.4] text-muted">
                Pilih kamera atau galeri perangkat
              </p>
            </div>
            <div className="grid gap-0 p-2">
              <button
                type="button"
                onClick={() => openSource("camera")}
                className="flex h-12 items-center gap-3 rounded-[12px] px-3 text-left text-[13px] font-bold text-ink transition hover:bg-teal-tint"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-field text-teal-deep">
                  <Camera size={18} />
                </span>
                Ambil dari kamera
              </button>
              <button
                type="button"
                onClick={() => openSource("gallery")}
                className="flex h-12 items-center gap-3 rounded-[12px] px-3 text-left text-[13px] font-bold text-ink transition hover:bg-teal-tint"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-field text-teal-deep">
                  <Image size={18} />
                </span>
                Pilih dari galeri
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="flex h-11 w-full items-center justify-center border-t border-line text-[12px] font-bold text-muted transition hover:bg-field"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </>
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
    if (!form.color.trim()) {
      setError("Pilih warna kendaraan dari master warna.");
      return;
    }
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
    if (!isLikelyImageFile(file)) {
      setAIError("Pilih file gambar dari galeri atau perangkat (JPG, PNG, WEBP, HEIC, dll).");
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
      setAIError("Lengkapi ketiga foto agar AI Mobix Assistant dapat membaca data kendaraan.");
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
      setAIError(cause instanceof Error ? cause.message : "AI Mobix Assistant belum dapat membaca foto.");
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
              Bantuan AI Mobix Assistant
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
                      <div className="text-[12px] font-extrabold text-ink">Data berhasil dibaca AI Mobix Assistant</div>
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

              <Field label="Warna" required hint="Ketik untuk mencari, lalu pilih warna kendaraan yang sesuai.">
                <ColorCombobox
                  value={form.color}
                  onChange={(value) => update("color", value)}
                />
              </Field>

              <Field label="Jarak Tempuh (KM)" required hint="KM standar adalah 15.000 per tahun kendaraan.">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatThousands(form.mileage)}
                  onChange={(event) => update("mileage", event.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 50.000"
                  required
                  className="h-11 w-full rounded-[12px] border border-line bg-surface px-3.5 text-[13px] text-ink outline-none transition placeholder:text-placeholder focus:border-teal-deep"
                />
              </Field>

              <Field label="Atas Nama" required hint="Pilih jenis kepemilikan yang tercantum pada dokumen kendaraan.">
                <SelectField
                  value={form.ownershipType}
                  onChange={(value) => update("ownershipType", value)}
                  placeholder="Pilih jenis kepemilikan"
                  required
                >
                  <option value="Perorangan">Perorangan</option>
                  <option value="Perusahaan">Perusahaan</option>
                  <option value="Perusahaan (Rental)">Perusahaan (Rental)</option>
                </SelectField>
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
                    AI Mobix Assistant bantu hitungkan harga
                  </h2>
                  <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-muted">
                    Unggah tiga foto. AI Mobix Assistant akan membaca data kendaraan, lalu Anda tetap dapat memeriksa dan mengubah hasilnya.
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-[14px] border border-[#E8D7A2] bg-[#FFF9E8] p-3">
                <div className="text-[11px] font-extrabold text-ink">Privasi foto STNK</div>
                <p className="m-0 mt-1 text-[10px] leading-[1.5] text-muted">
                  Foto STNK dapat memuat data pribadi. Anda dapat menutupi nama, alamat, nomor rangka, dan nomor mesin selama data kendaraan serta masa berlaku STNK tetap terbaca. Foto hanya digunakan AI Mobix Assistant untuk membaca data kendaraan; informasi pribadi tersebut tidak diambil ke hasil prediksi.
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
                {aiAnalyzing ? "AI Mobix Assistant sedang membaca foto..." : "Baca Data Kendaraan"}
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
