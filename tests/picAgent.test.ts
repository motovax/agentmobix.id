import { describe, expect, test } from "bun:test";
import {
  buildPicAgentGreeting,
  buildPicAgentWhatsAppHref,
  PIC_AGENT_WHATSAPP,
} from "../src/lib/picAgent";

describe("PIC Agent WhatsApp CTA", () => {
  test("includes the selected unit in the greeting", () => {
    expect(
      buildPicAgentGreeting({
        nama: "Toyota Calya 1.2 G 2019",
        plate_no: "b 1234 xyz",
      }),
    ).toBe(
      "Halo Kak Wella, saya mau diskusi mengenai unit Toyota Calya 1.2 G 2019 (B 1234 XYZ) di AgenMobix. Mohon dibantu untuk detail unit dan opsi kreditnya ya.",
    );
  });

  test("builds a prefilled wa.me link to the PIC Agent number", () => {
    const href = buildPicAgentWhatsAppHref({
      nama: "Toyota Calya 1.2 G 2019",
      plate_no: "B 1234 XYZ",
    });
    const url = new URL(href);

    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe(`/${PIC_AGENT_WHATSAPP}`);
    expect(url.searchParams.get("text")).toContain("Toyota Calya 1.2 G 2019");
    expect(url.searchParams.get("text")).toContain("B 1234 XYZ");
  });

  test("keeps the greeting useful while unit data is loading", () => {
    expect(buildPicAgentGreeting()).toBe(
      "Halo Kak Wella, saya mau diskusi mengenai unit di AgenMobix. Mohon dibantu untuk detail unit dan opsi kreditnya ya.",
    );
  });
});
