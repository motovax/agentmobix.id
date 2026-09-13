/**
 * Layanan Foto AI (AI background) Mobix.
 *
 * Endpoint meneruskan error penyedia apa adanya, mis.
 * "AI background endpoint status 402: Insufficient credits. Add more using ...".
 * Agen di lapangan butuh kalimat yang bisa ditindaklanjuti, bukan kode HTTP.
 */
export function describeAiBackgroundError(raw: string): string {
  const message = (raw || "").trim();
  if (!message) return "Foto AI gagal dibuat. Coba lagi sebentar lagi.";

  if (/\b402\b|insufficient credit|quota|billing|payment required/i.test(message)) {
    return "Kuota layanan Foto AI sedang habis. Hubungi tim Mobix untuk isi ulang, lalu coba lagi.";
  }
  if (/\b429\b|rate limit|too many request/i.test(message)) {
    return "Layanan Foto AI sedang padat. Tunggu sebentar lalu coba lagi.";
  }
  if (/\b40[13]\b|unauthor|forbidden|invalid token|api key/i.test(message)) {
    return "Akses layanan Foto AI ditolak. Hubungi tim Mobix untuk cek konfigurasi.";
  }
  if (/\b5\d{2}\b|timeout|terlalu lama|unavailable|gateway/i.test(message)) {
    return "Layanan Foto AI sedang bermasalah. Coba lagi beberapa saat lagi.";
  }
  if (/failed to fetch|network|jaringan/i.test(message)) {
    return "Koneksi ke layanan Foto AI terputus. Cek jaringan lalu coba lagi.";
  }
  // Pesan yang sudah berbahasa manusia (tanpa kode status) boleh tampil apa adanya.
  if (message.length <= 120 && !/status \d{3}|https?:\/\//i.test(message)) {
    return message;
  }
  return "Foto AI gagal dibuat. Coba lagi sebentar lagi.";
}