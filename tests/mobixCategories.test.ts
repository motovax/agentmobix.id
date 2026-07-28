import { expect, test } from "bun:test";
import { fetchCategories } from "../src/lib/mobix";

test("kategori dimuat tanpa probe katalog per kategori", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({
      status: "success",
      code: 200,
      error: "",
      message: "",
      data: ["MPV", "SUV"],
      metadata: {},
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    expect(await fetchCategories()).toEqual(["MPV", "SUV"]);
    expect(calls).toEqual(["https://mobix.motovax.com/daftar-kategori"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
