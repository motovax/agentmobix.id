import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AppShell } from "../components/AppShell";
import { AppBar } from "../components/AppBar";
import { BottomNav } from "../components/BottomNav";
import { FloatingContactCta } from "../components/FloatingContactCta";
import { MapPin } from "../components/icons";
import { fetchCabang, type CabangDetail } from "../lib/mobix";
import { useAsync } from "../lib/useAsync";

function branchIcon(active: boolean) {
  const fill = active ? "#0E1B1E" : "#1ECFCB";
  return L.divIcon({
    className: "",
    html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 20 12 20S24 20.25 24 12C24 5.373 18.627 0 12 0z" fill="${fill}"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
}

function MapController({
  branches,
  selected,
}: {
  branches: CabangDetail[];
  selected: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (branches.length === 0) return;
    if (branches.length === 1) {
      map.setView([branches[0].lat, branches[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(
        branches.map((b) => [b.lat, b.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [branches.length]);

  useEffect(() => {
    if (!selected) return;
    const b = branches.find((b) => b.nama === selected);
    if (b) map.flyTo([b.lat, b.lng], 15, { duration: 0.8 });
  }, [selected]);

  return null;
}

export function Lokasi() {
  const { data, loading, error } = useAsync(fetchCabang, []);
  const cabang = data ?? [];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppShell>
      <AppBar
        title="Cabang Mobix"
        subtitle={
          loading
            ? "Memuat cabang…"
            : `${cabang.length} cabang · stok bisa lintas cabang`
        }
      />

      <div className="relative z-0 h-[220px] w-full">
        <MapContainer
          center={[-6.25, 106.85]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {cabang.map((b) => (
            <Marker
              key={b.nama}
              position={[b.lat, b.lng]}
              icon={branchIcon(selected === b.nama)}
              eventHandlers={{ click: () => setSelected(b.nama) }}
            >
              <Popup>{b.nama}</Popup>
            </Marker>
          ))}
          <MapController branches={cabang} selected={selected} />
        </MapContainer>
      </div>

      <main className="flex flex-col gap-2.5 p-3.5">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[90px] animate-pulse rounded-2xl bg-line" />
          ))}

        {!loading && error && (
          <div className="rounded-2xl border border-danger-border bg-danger-bg px-4 py-8 text-center text-[13px] font-semibold text-danger">
            Gagal memuat data cabang.
          </div>
        )}

        {!loading &&
          !error &&
          cabang.map((b: CabangDetail) => (
            <div
              key={b.nama}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(b.nama)}
              onKeyDown={(e) => e.key === "Enter" && setSelected(b.nama)}
              className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors ${
                selected === b.nama
                  ? "border-teal-deep bg-teal-tint"
                  : "border-line bg-surface active:bg-surface-2"
              }`}
            >
              <div
                className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                  selected === b.nama
                    ? "bg-ink text-surface"
                    : "bg-teal-tint text-teal-deep"
                }`}
              >
                <MapPin />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="text-[14px] font-bold">{b.nama}</div>
                  {b.stok_ready > 0 && (
                    <span className="rounded-md bg-teal-tint px-1.5 py-0.5 text-[10px] font-bold text-teal-deep">
                      {b.stok_ready} unit
                    </span>
                  )}
                </div>
                <div className="mt-[3px] text-[12px] leading-[1.45] text-muted">
                  {b.alamat}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-teal-deep">
                  {b.telepon && (
                    <a
                      href={`tel:${b.telepon}`}
                      className="no-underline text-teal-deep"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.telepon}
                    </a>
                  )}
                  {b.pic && (
                    <>
                      {b.telepon && <span className="text-muted">·</span>}
                      <span>PIC {b.pic}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

        {/* Reserve room for the floating CTA and bottom navigation. */}
        <div className="h-[160px]" />
      </main>

      <FloatingContactCta bottomClassName="bottom-[calc(112px+env(safe-area-inset-bottom))]" />
      <BottomNav active="lokasi" />
    </AppShell>
  );
}
