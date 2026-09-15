import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Photo } from "./ui";
import { blurPlateSource } from "../lib/plateBlur";

/** Foto asli tidak dipasang ke DOM sebelum pemeriksaan selesai. */
export function VehiclePhoto({ src, children, ...props }: ComponentProps<typeof Photo>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; url?: string; detected?: number; failed?: boolean }>();
  const key = `${src}|${retry}`;
  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "100px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !src) return;
    let cancelled = false;
    let url: string | undefined;
    blurPlateSource(src).then((processed) => {
      if (cancelled) return;
      url = URL.createObjectURL(processed.blob);
      setResult({ key, url, detected: processed.detected });
    }).catch(() => { if (!cancelled) setResult({ key, failed: true }); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [src, visible, key]);
  const current = result?.key === key ? result : undefined;
  const message = current?.failed ? "Foto belum dapat diperiksa" : current?.url
    ? current.detected ? "Plat terdeteksi diblur otomatis" : "Plat tidak terdeteksi; periksa sebelum dibagikan"
    : "Memeriksa plat…";
  return (
    <div ref={ref} className={`relative overflow-hidden ${props.className ?? ""}`} title={src ? message : undefined}>
      <Photo {...props} src={current?.url} placeholderSrc={undefined} className="h-full w-full" emptyLabel={src ? undefined : props.emptyLabel}>
        {src && !current?.url && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-2 px-2 text-center text-[10px] text-muted" role="status">
            <span>{message}</span>
            {current?.failed && <button type="button" className="relative z-10 underline" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setRetry((n) => n + 1); }}>Coba lagi</button>}
          </div>
        )}
        {props.large && current?.url && <span className="absolute left-1/2 top-2 max-w-[50%] -translate-x-1/2 rounded bg-black/70 px-2 py-1 text-center text-[10px] text-white">{message}</span>}
        {children}
      </Photo>
    </div>
  );
}
