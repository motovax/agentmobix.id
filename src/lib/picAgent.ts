export const PIC_AGENT_NAME = "Wella";
export const PIC_AGENT_WHATSAPP = "6285714130633";

type DiscussedUnit = {
  nama?: string | null;
  plate_no?: string | null;
};

export function buildPicAgentGreeting(unit?: DiscussedUnit | null) {
  const name = unit?.nama?.trim();
  const plate = unit?.plate_no?.trim().toUpperCase();
  const unitLabel = [name, plate ? `(${plate})` : ""].filter(Boolean).join(" ");
  const topic = unitLabel
    ? `unit ${unitLabel} di AgenMobix`
    : "unit di AgenMobix";

  return [
    `Halo Kak ${PIC_AGENT_NAME}, saya mau diskusi mengenai ${topic}.`,
    "Mohon dibantu untuk detail unit dan opsi kreditnya ya.",
  ].join(" ");
}

export function buildPicAgentWhatsAppHref(unit?: DiscussedUnit | null) {
  const message = buildPicAgentGreeting(unit);
  return `https://wa.me/${PIC_AGENT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
