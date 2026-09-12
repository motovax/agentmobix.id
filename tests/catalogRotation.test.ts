import { expect, test } from "bun:test";
import { fetchUnits } from "../src/lib/mobix";

interface StubUnit {
  id: string;
}

function unitPage(ids: string[], seed: string, total: number, totalPages: number) {
  return new Response(JSON.stringify({
    status: "success",
    code: 200,
    error: "",
    message: "",
    data: ids.map((id) => ({ id, harga: 100_000_000, plate_no: `B${id}XX`, slug: id })),
    metadata: {
      total_data: total,
      page: 1,
      limit: 100,
      total_pages: totalPages,
      rotation_seed: seed,
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("rotation_seed dari respons diteruskan ke pemanggil", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => unitPage(["a", "b"], "2026091214", 2, 1)) as typeof fetch;
  try {
    const res = await fetchUnits({ page: 1, limit: 12 });
    expect(res.rotationSeed).toBe("2026091214");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rotation_seed dikirim ke API saat diminta halaman berikutnya", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body ?? "{}")));
    return unitPage(["c"], "2026091214", 24, 2);
  }) as typeof fetch;

  try {
    await fetchUnits({ page: 2, limit: 12, rotation_seed: "2026091214" });
    expect(bodies[0]?.rotation_seed).toBe("2026091214");
    expect(bodies[0]?.page).toBe(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("penelusuran filter harga mengunci satu seed di semua halaman kandidat", async () => {
  const originalFetch = globalThis.fetch;
  const seeds: (string | undefined)[] = [];
  let call = 0;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { rotation_seed?: string };
    seeds.push(body.rotation_seed);
    call += 1;
    // Two candidate pages; only the first advertises the seed.
    return call === 1
      ? unitPage(["p1"], "2026091214", 200, 2)
      : unitPage(["p2"], "2026091215", 200, 2);
  }) as typeof fetch;

  try {
    await fetchUnits({ harga_awal: 1, harga_akhir: 999_000_000, page: 1, limit: 12 });
    // First page discovers the seed, every later page replays it — even though
    // the server would have rotated to a new bucket by then.
    expect(seeds.length).toBeGreaterThan(1);
    expect(seeds[0]).toBeUndefined();
    expect(seeds.slice(1).every((s) => s === "2026091214")).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
