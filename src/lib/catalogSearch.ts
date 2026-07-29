import { classifyQuery, type ListRequest } from "./mobix";

export interface CatalogSearchFilters {
  priceMin?: number;
  priceMax?: number;
  transmisi?: string;
  lokasi?: string;
}

export interface CatalogUrlState {
  query: string;
  kategori: string;
  filters?: CatalogSearchFilters;
}

type CatalogSearchParams = Pick<
  ListRequest,
  | "judul"
  | "merek"
  | "bahan_bakar"
  | "transmisi"
  | "plate_no"
  | "lokasi"
  | "harga_awal"
  | "harga_akhir"
>;

export function buildCatalogSearchParams(
  query: string,
  filters: CatalogSearchFilters = {},
): CatalogSearchParams {
  const normalizedQuery = query.trim();
  const classification = normalizedQuery
    ? classifyQuery(normalizedQuery)
    : null;
  const fromQuery = classification
    ? {
        judul:
          classification.param === "judul"
            ? classification.value
            : undefined,
        merek:
          classification.param === "merek"
            ? classification.value
            : undefined,
        bahan_bakar:
          classification.param === "bahan_bakar"
            ? classification.value
            : undefined,
        transmisi:
          classification.param === "transmisi"
            ? classification.value
            : undefined,
        plate_no:
          classification.param === "plate_no"
            ? classification.value
            : undefined,
      }
    : {};

  return {
    ...fromQuery,
    transmisi:
      fromQuery.transmisi ??
      (filters.transmisi ? [filters.transmisi] : undefined),
    lokasi: filters.lokasi ? [filters.lokasi] : undefined,
    harga_awal: filters.priceMin,
    harga_akhir: filters.priceMax,
  };
}

export function buildCatalogHref({
  query,
  kategori,
  filters = {},
}: CatalogUrlState): string {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();

  if (normalizedQuery) params.set("q", normalizedQuery);
  if (kategori) params.set("kategori", kategori);
  if (filters.priceMin !== undefined) {
    params.set("harga_min", String(filters.priceMin));
  }
  if (filters.priceMax !== undefined) {
    params.set("harga_max", String(filters.priceMax));
  }
  if (filters.transmisi) params.set("transmisi", filters.transmisi);
  if (filters.lokasi) params.set("lokasi", filters.lokasi);

  const search = params.toString();
  return search ? `/katalog?${search}` : "/katalog";
}

export function buildUnitDetailHref(
  slug: string,
  catalogHref: string,
): string {
  const params = new URLSearchParams({ kembali: catalogHref });
  return `/unit/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function getCatalogReturnHref(search: string): string {
  const href = new URLSearchParams(search).get("kembali");
  if (href === "/katalog" || href?.startsWith("/katalog?")) return href;
  return "/katalog";
}
