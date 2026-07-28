import { describe, expect, test } from "bun:test";
import { MOTOVAX_SALES_AGENT_APP_URL } from "../src/lib/salesAgent";

describe("tautan login Sales Agent", () => {
  test("mengarah ke aplikasi MotoVax melalui HTTPS", () => {
    const url = new URL(MOTOVAX_SALES_AGENT_APP_URL);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("mobix.motovax.com");
    expect(url.pathname).toBe("/");
  });
});
