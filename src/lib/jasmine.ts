export const JASMINE_WHATSAPP = "6281190015515";

export function buildJasmineWhatsAppHref(message: string) {
  return `https://wa.me/${JASMINE_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
