# Share popup: kemampuan foto + caption per sosmed

Dokumen ini merangkum **apa yang bisa / tidak bisa** dilakukan channel di **popup fallback** fitur share AgenMobix, alasannya, dan opsi solusi agar user tetap bisa membagikan **foto + caption**.

**Terakhir diperbarui:** 2026-08-07  
**Konteks produk:** halaman `/share?u=<slug>` di https://agenmobix.id

---

## 1. Dua jalur share (penting dibedakan)

| Jalur | Kapan muncul | Foto file dari app? | Caption teks? |
|--------|----------------|---------------------|---------------|
| **Web Share API** (sheet sistem HP) | Smartphone + browser support `navigator.share` | Bisa, ke app yang mendukung file | Bisa / tergantung app target |
| **Popup channel** (fallback) | Desktop, browser tanpa Web Share, atau native gagal | Hampir selalu **tidak** (hanya URL/teks) | Hanya di channel yang punya intent teks |

Popup **bukan** pengganti penuh Web Share. Popup mengandalkan **deep link / web intent** (`wa.me`, `sharer.php`, dll.), yang oleh platform dibatasi.

---

## 2. Channel di popup saat ini

| Channel | Kode | URL / perilaku utama |
|---------|------|----------------------|
| WhatsApp | `wa` | `https://wa.me/?text=...` |
| Telegram | `tg` | `https://t.me/share/url?url=...&text=...` |
| Facebook | `fb` | `https://www.facebook.com/sharer/sharer.php?u=<OG_URL>` |
| Instagram | `ig` | Salin caption → buka `https://www.instagram.com/` |
| TikTok | `tt` | Salin caption → buka `https://www.tiktok.com/` |
| Threads | `threads` | `https://www.threads.net/intent/post?text=...` |
| X / Twitter | `x` | `https://x.com/intent/tweet?text=...` |
| Salin teks | — | Clipboard caption + link unit |

**Open Graph (Facebook preview link):**  
`https://agentmobix-api.margi-landshark.workers.dev/og?u=<slug>`  
- Crawler (FB, dll.): HTML dengan `og:title`, `og:description`, `og:image`  
- User biasa: redirect ke `https://agenmobix.id/share?u=<slug>`

Implementasi terkait:

- `src/lib/shareActions.ts` — URL channel + deteksi native share  
- `src/pages/ShareSheet.tsx` — UI popup + Web Share  
- `worker/index.js` — endpoint `/og` untuk preview Facebook  

---

## 3. Possibility: foto + caption per sosmed (popup)

| Channel | Foto file app via popup? | Caption via popup? | Preview foto lewat link (OG)? | Alasan limitasi |
|---------|--------------------------|--------------------|---------------------------------|-----------------|
| **WhatsApp** | Tidak | **Ya** (teks + link) | Tidak (hanya teks di chat) | Web intent `wa.me` **hanya query teks**, tidak menerima `File` dari browser |
| **Telegram** | Tidak | **Ya** (`url` + `text`) | Ya, jika URL punya preview | Web share Telegram = link + teks, bukan upload attachment |
| **Facebook** | Tidak | **Tidak** (param `quote` diabaikan) | **Ya** (via URL OG) | `sharer.php` hanya **URL**; Facebook mengisi post dari scrape Open Graph; tidak ada upload file web publik |
| **Instagram** | Tidak | **Sebagian** (disalin ke clipboard, tempel manual) | Tidak relevan | **Tidak ada** web intent resmi untuk prefill caption + foto |
| **TikTok** | Tidak | **Sebagian** (clipboard + buka app) | Tidak relevan | Sama: tidak ada web intent prefill caption/foto |
| **Threads** | Tidak | **Ya** (intent `text`) | Preview link jika URL di teks | Intent teks/link; bukan upload media dari website |
| **X / Twitter** | Tidak | **Ya** (intent `text`) | Card jika URL di tweet + OG bagus | Intent tweet = teks; media butuh unggah di app atau API ber-OAuth |
| **Salin teks** | Tidak | **Ya** | — | Hanya clipboard; dipasangkan dengan download media |

### Ringkas

| Yang diinginkan | Realistis lewat popup saja? |
|-----------------|-----------------------------|
| Caption saja | Ya (WA, TG, Threads, X, Salin) |
| Link + preview foto (FB) | Ya (OG Worker) |
| **Foto file + caption otomatis** | **Tidak** di hampir semua channel web |

---

## 4. Kenapa popup sulit “foto + caption” otomatis?

1. **Browser security** — website tidak boleh menyematkan file lokal ke URL `https://wa.me/...` / Facebook sharer.  
2. **Kebijakan platform** — Meta / TikTok / X tidak membuka web API “post foto + caption dari situs pihak ketiga” tanpa OAuth & review app.  
3. **Yang web intent izinkan** — umumnya **teks**, **URL**, kadang **scrape preview** (Open Graph).  
4. **SPA GitHub Pages** — HTML statis; tanpa endpoint server (seperti Worker `/og`), crawler tidak melihat meta per unit.

---

## 5. Solusi agar user tetap bisa share foto + caption

### 5.1 Praktis (sudah / cocok product sekarang)

| Solusi | Channel yang terbantu | Catatan |
|--------|------------------------|---------|
| **Web Share native di HP** | Semua app terinstal yang support file | Prioritas: sheet sistem dulu; popup = fallback |
| **Download media siap-posting** | IG, TikTok, FB, WA, dll. | User unggah foto di app |
| **Salin caption + link** | IG, TikTok, FB, dll. | Tempel manual di caption post |
| **Open Graph untuk Facebook** | Facebook (preview link) | Judul + harga + foto unit di preview, **bukan** upload file ke feed |

Alur manual yang andal:

1. Tunggu media selesai disiapkan.  
2. **Salin** caption (atau pakai channel yang menyalin otomatis: IG/TikTok).  
3. **Download** foto/video.  
4. Buka app sosmed → unggah media → tempel caption.

### 5.2 UX product (disarankan, tanpa OAuth)

| Solusi | Manfaat |
|--------|---------|
| Satu tombol **“Siapkan post: salin caption + download foto”** | Mengurangi langkah manual |
| Label jujur di popup per channel (*Teks* / *Link preview* / *Buka app + tempel*) | Kurangi ekspektasi “langsung post lengkap” |
| Panduan singkat di bawah popup untuk IG/TikTok/FB | Onboarding agen |

### 5.3 Solusi “post otomatis penuh” (scope terpisah / mahal)

| Solusi | Kebutuhan |
|--------|-----------|
| OAuth + API resmi (Meta Graph, X API, TikTok Content Posting) | Login user, token, review app, compliance |
| Backend publish atas nama akun bisnis | Infra, secret management, audit |

Ini **bukan** perbaikan kecil di popup; ini fitur **integrasi publishing**.

---

## 6. Matriks rekomendasi product

| Kebutuhan user | Rekomendasi |
|----------------|-------------|
| Share cepat di **HP** ke app mana pun | Andalkan **Web Share** (native sheet) |
| Share di **laptop** ke WA/Telegram | Popup teks + link OK |
| Preview bagus di **Facebook** | Popup FB + **OG URL** (sudah) |
| Post **IG / TikTok / feed FB** dengan foto | Download + salin caption (atau native share) |
| Post otomatis multi-platform | Project OAuth/API terpisah |

---

## 7. Status teknis terkait (ringkas)

| Fitur | Status |
|-------|--------|
| Web Share native HP + fallback popup | Ada |
| Popup: WA, TG, FB, IG, TikTok, Threads, X, Salin | Ada |
| Default 1 foto (stabilitas multi-file Android) | Ada |
| Reduce batch file jika `canShare` tolak | Ada |
| OG Worker `/og?u=` untuk preview Facebook | Ada (deploy worker) |
| Upload foto langsung via popup ke semua sosmed | **Tidak memungkinkan** secara web standar |

---

## 8. Verifikasi manual (opsional)

### Open Graph Facebook

1. URL:  
   `https://agentmobix-api.margi-landshark.workers.dev/og?u=honda-mobilio-1-5l-e-at-ac-digital-2016-818d0546`
2. Browser biasa → redirect ke halaman share.  
3. User-Agent crawler / [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → harus melihat `og:title`, `og:image`, deskripsi harga/cabang.  
4. Cache FB bisa lambat; gunakan **Scrape Again** di debugger.

### Popup di app

1. Hard refresh https://agenmobix.id/share?u=...  
2. Desktop / fallback → buka popup.  
3. Cek tiap channel sesuai tabel di §3.

---

## 9. Referensi kode

| File | Peran |
|------|--------|
| `src/lib/shareActions.ts` | `buildChannelShareUrl`, `buildOpenGraphShareUrl`, Web Share helpers |
| `src/pages/ShareSheet.tsx` | UI share, native sheet, popup channel |
| `worker/index.js` | Proxy API + `GET /og` Open Graph |
| `docs/share-popup-foto-caption.md` | Dokumen ini |

---

## 10. Kesimpulan

- **Popup** cocok untuk **teks/link** (dan **preview link FB** lewat OG).  
- **Foto file + caption otomatis** di popup **tidak realistis** untuk hampir semua sosmed karena limitasi web intent platform.  
- Solusi praktis: **Web Share di HP** + **download media** + **salin caption**; Facebook link preview diperbaiki lewat **Open Graph**.  
- Post otomatis penuh ke banyak platform = **integrasi OAuth/API**, di luar scope popup share biasa.
