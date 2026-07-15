import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AppBar } from "../components/AppBar";
import { AppShell } from "../components/AppShell";
import { WhatsApp } from "../components/icons";
import { formatRupiah } from "../lib/format";
import { getWhatsAppUrl, type SellCarResult } from "../lib/sellCar";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-ink">{value || "-"}</div>
    </div>
  );
}

function formatStnk(value: string): string {
  if (!value) return "-";
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}

export function JualMobilHasil() {
  const [, navigate] = useLocation();
  const [result, setResult] = useState<SellCarResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("mobix-sell-car-result");
    if (!raw) {
      navigate("/jual-mobil");
      return;
    }
    try {
      setResult(JSON.parse(raw) as SellCarResult);
    } catch {
      navigate("/jual-mobil");
    }
  }, [navigate]);

  if (!result) return null;

  const whatsappUrl = getWhatsAppUrl(result);
  return (
    <AppShell>
      <AppBar title="Hasil Prediksi" subtitle="Cek kembali data kendaraan Anda" back="/jual-mobil" />
      <main className="px-3.5 pb-8">
        <section className="rounded-[22px] border border-line bg-surface p-[18px] shadow-sm">
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.02em] text-ink">Prediksi Harga Mobil Kamu</h1>
          <div className="mt-5 text-center">
            <div className="text-[12px] text-muted">Rekomendasi Harga</div>
            <div className="mt-1 text-[21px] font-extrabold leading-tight text-teal-deep">
              {formatRupiah(result.recommendedPrice)} - {formatRupiah(result.recommendedPrice)}
            </div>
          </div>

          <div className="mt-5 rounded-[14px] bg-[#FFF19A] px-3.5 py-3 text-center text-[12px] font-semibold leading-[1.5] text-[#7D786B]">
            <div>Harga ini masih berupa estimasi dan dapat mengalami perubahan.</div>
            <div>Tim kami akan menghubungi Anda setelah data yang Anda kirimkan berhasil kami terima.</div>
            <div className="mt-1.5 font-bold text-[#5E5A50]">kalo mau dapat harga tertinggi hubungi Albert</div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-[11px] font-extrabold text-white no-underline shadow-wa"
            >
              <WhatsApp size={15} /> Hubungi Albert via WhatsApp
            </a>
          </div>

          <div className="mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-[18px] border-2 border-line bg-surface-3 text-[#9AA0A3]">
            <svg width="82" height="62" viewBox="0 0 82 62" fill="none" aria-hidden="true">
              <path d="M11 40V29c0-2 1-4 3-5l7-13c1-2 3-3 6-3h24c3 0 5 1 7 3l8 8 10 2c3 1 5 3 5 6v13c0 3-2 5-5 5H16c-3 0-5-2-5-5Z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
              <circle cx="26" cy="46" r="8" fill="white" stroke="currentColor" strokeWidth="7" />
              <circle cx="64" cy="46" r="8" fill="white" stroke="currentColor" strokeWidth="7" />
            </svg>
          </div>

          <div className="mt-5 text-center">
            <div className="text-[12px] text-muted">{result.brand}</div>
            <h2 className="m-0 mt-1 text-[18px] font-extrabold leading-tight text-ink">
              {result.model} ({result.variant}) {result.year}
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-7 gap-y-5">
            <Detail label="Model" value={result.model} />
            <Detail label="Varian" value={result.variant} />
            <Detail label="Tahun Keluaran" value={result.year} />
            <Detail label="Transmisi" value={result.transmission} />
            <Detail label="Jarak Tempuh" value={result.mileage ? `${Number(result.mileage).toLocaleString("id-ID")} km` : "-"} />
            <Detail label="Warna" value={result.color} />
            <Detail label="Masa Berlaku STNK" value={formatStnk(result.stnk)} />
            <Detail label="Plat" value={result.plate} />
          </div>

          <div className="mt-7">
            <Link href="/jual-mobil" className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#E6E6E6] text-[13px] font-bold text-ink no-underline">
              Kembali
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
