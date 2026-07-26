# 5 Rencana Alternatif: Filter Pengguna AgenMobix

**Task:** `aaizcpwxlkxravhkdelntpmi`  
**Concern utama:** banyak foto unit disalahgunakan orang sebagai DP (foto profil) pribadi.  
**Status dokumen:** proposal untuk review manusia — belum diimplementasi.

---

## 1. Konteks kondisi saat ini (main terbaru)

| Area | Perilaku sekarang | Implikasi |
|------|-------------------|-----------|
| **Browser biasa** (`agenmobix.id`) | **Tanpa login** — katalog, detail unit, share, download terbuka | Siapa saja bisa buka dan unduh foto unit |
| **WebView app AgenMobix** | Login Motovax wajib jika `User-Agent` memuat token `AgenMobix` / `AgentMobix` (`src/lib/runtime-mode.ts` + `src/main.tsx`) | Hanya channel app yang digate |
| **Auth** | `POST /api/auth/login` + `GET /api/auth/me` (`src/lib/auth.tsx`) | Sudah ada `is_sales_agent`, `is_marketing_rep`, `role`, `permissions` |
| **Filter role pasca-login** | **Belum dipakai** — user Motovax mana pun yang login dapat akses penuh | Akun non-agen masih bisa masuk app |
| **Share / download** | Compose dengan `includeOverlay: false` (`ShareSheet` → `buildImageFilesForShare`) | File “siap-posting” **tanpa** pill harga/TDP → mirip foto clean |
| **URL foto** | Publik di origin Mobix (`/unit-file-serve?…`, resize `?w=`) | Long-press / open-in-new-tab / curl tetap bisa dapat gambar |
| **Daftar agen** | Form → WhatsApp PIC; tidak ada approve otomatis di app | Onboarding agen lepas dari gate login |

**Akar masalah (bukan hanya “login”):**  
Filter user di app **tidak menutup** jalur foto publik. Selama URL gambar bisa di-fetch tanpa sesi agen, penyalahgunaan DP tetap mudah lewat browser, DevTools, atau link langsung.

---

## 2. Tujuan desain

1. **Kurangi** penyalahgunaan foto unit sebagai DP / konten non-penjualan.
2. **Pertahankan** alur agen resmi: browse → compose → share ke prospek.
3. **Filter** siapa yang boleh akses full gallery / download / AI background.
4. Pilih opsi yang cocok dengan **effort** tim (frontend SPA + Motovax API) dan **friksi** onboarding agen.

---

## 3. Lima rencana alternatif

Skala effort: **S** (hari) · **M** (1–2 minggu) · **L** (beberapa sprint, butuh backend Motovax).

---

### Rencana A — Hardening aset foto (cepat, minim filter akun)

**Inti:** Tidak mengubah model user dulu; buat foto **tidak menarik / sulit** dipakai sebagai DP.

**Langkah utama**

1. **Paksa watermark branding** pada semua output share/download (selalu `includeOverlay: true` + logo/teks “Mobix · stok resmi”, plat blur opsional).
2. **Nonaktifkan “Download media siap-posting”** di browser publik; di app agen biarkan share via `navigator.share` saja (file tetap ber-watermark).
3. **Turunkan resolusi** preview di web (`w=420`–`800`); full-res hanya lewat endpoint compose ber-watermark.
4. CSS/`pointer-events` anti long-press (mitigasi lemah, tapi kurangi casual save).
5. (Opsional backend) header `Cache-Control` + referer/CORS ketat di `unit-file-serve` — **tidak 100%** vs curl, tapi mengurangi hotlink.

**Filter pengguna:** tidak ada (tetap publik).  
**Effort:** **S** (hampir seluruhnya di `ShareSheet` + `mobix.ts`).  
**Efektivitas vs DP:** sedang — watermark membuat foto jelek untuk DP; raw URL masih bocor.  
**Risiko:** agen yang butuh foto “bersih” untuk marketplace pihak ketiga akan komplain.  
**Cocok jika:** ingin hasil dalam 1–2 hari sambil merancang gate yang lebih kuat.

---

### Rencana B — Filter role Motovax (manfaatkan auth yang sudah ada)

**Inti:** Di channel yang sudah login (app WebView), **tolak** user yang bukan agen penjualan.

**Langkah utama**

1. Setelah `/api/auth/me`, enforce misalnya:
   - `user.is_sales_agent === true`, **atau**
   - `role` / `permissions` yang disepakati Motovax (whitelist string).
2. UI: layar “Akun belum terdaftar sebagai Agen Mobix — hubungi PIC” + logout.
3. Sinkronkan proses **Daftar Agen** (WhatsApp) dengan flag `is_sales_agent` di Motovax (ops / admin).
4. Logging sederhana: failed login vs “login sukses tapi role ditolak”.

**Filter pengguna:** ya — berdasarkan atribut akun Motovax.  
**Effort:** **S–M** (frontend filter + kesepakatan flag di backend; mungkin butuh seed data agen).  
**Efektivitas vs DP:** rendah–sedang jika **hanya** di app (browser publik tetap terbuka).  
**Risiko:** false negative (agen valid tanpa flag) → butuh runbook PIC.  
**Cocok jika:** kebocoran utama lewat app internal / akun karyawan non-agen.

**Catatan:** Rencana B **sendiri tidak cukup** untuk concern DP dari pengunjung web.

---

### Rencana C — Dual surface: publik teaser vs agen full (direkomendasikan sebagai arah produk)

**Inti:** Dua mode akses eksplisit.

| Mode | Siapa | Yang boleh | Yang tidak |
|------|--------|------------|------------|
| **Publik** (browser) | Siapa saja | Katalog ringkas, harga, lokasi, CTA daftar/WA PIC | Gallery hi-res, download, AI background, share multi-foto clean |
| **Agen** (login Motovax + role agen) | Agen approved | Full gallery, share ber-watermark, komisi, tools | Opsional: raw tanpa watermark tetap dilarang |

**Langkah utama**

1. `requiresAgentLogin` **bukan hanya** User-Agent app:
   - Opsi C1: route sensitif (`/share`, full gallery di `/unit/:slug`) butuh login di **semua** client.
   - Opsi C2: app WebView = full gate; web = teaser + tombol “Buka di app Agen / Login agen”.
2. Terapkan **Rencana B** di dalam mode agen.
3. Terapkan watermark **Rencana A** untuk semua file yang keluar dari share.
4. Detail unit publik: 1–2 foto kecil ber-watermark; sisanya “login sebagai agen”.

**Filter pengguna:** ya — guest vs agen.  
**Effort:** **M**.  
**Efektivitas vs DP:** tinggi untuk casual abuse; raw API image masih perlu langkah backend.  
**Risiko:** konversi marketing web turun sedikit (mitigasi: CTA daftar + teaser menarik).  
**Cocok jika:** ingin balance growth + proteksi stok visual.

---

### Rencana D — Full lock: seluruh SPA hanya agen authenticated

**Inti:** Produksi `agenmobix.id` **selalu** menampilkan `Login` sampai sesi Motovax valid + role agen (abaikan perbedaan User-Agent, atau treat semua sebagai portal agen).

**Langkah utama**

1. `requiresAgentLogin = true` di production (env flag, mis. `VITE_REQUIRE_AGENT_LOGIN=true`).
2. Halaman marketing/daftar dipindah ke domain/landing terpisah **atau** route `/daftar` tetap public exception.
3. Kombinasikan filter role (Rencana B).
4. Onboarding: PIC membuat akun Motovax dulu → baru agen bisa masuk.

**Filter pengguna:** ketat.  
**Effort:** **M** (produk + ops akun).  
**Efektivitas vs DP:** tinggi di lapisan app; **masih** butuh proteksi URL gambar.  
**Risiko:** kehilangan traffic SEO / sharing link unit ke prospek (link `/unit/x` mati tanpa login).  
**Cocok jika:** agenmobix.id diposisikan murni **tool internal agen**, bukan landing konsumen.

---

### Rencana E — Allowlist + media bertanda tangan + audit (paling ketat)

**Inti:** Kontrol di **server media**, bukan hanya UI React.

**Langkah utama**

1. **Allowlist agen** (tabel / flag Motovax): hanya ID terdaftar program Agen Mobix.
2. Endpoint katalog & detail untuk SPA memakai **Bearer user** (bukan hanya Developer API key di browser), atau proxy Worker yang inject scope per-user.
3. **Signed URL** foto: TTL pendek (mis. 5–15 menit), path tidak tebak-tebakan; raw path lama dinonaktifkan untuk publik.
4. Compose share **hanya server-side** dengan watermark wajib; client tidak pernah terima blob clean full-res.
5. **Rate limit** download/share per user; audit log (`user_id`, `unit_id`, `action`, `ip`).
6. Revoke: nonaktifkan agen → token & signed URL mati.

**Filter pengguna:** sangat ketat + terukur.  
**Effort:** **L** (perubahan Motovax API + Worker + SPA).  
**Efektivitas vs DP:** **paling tinggi**.  
**Risiko:** biaya eng, breaking change URL, cache CDN.  
**Cocok jika:** insiden penyalahgunaan foto sudah material (legal/brand) dan Motovax siap invest backend.

---

## 4. Matriks perbandingan

| Kriteria | A Hardening foto | B Filter role | C Dual surface | D Full lock | E Signed media |
|----------|:----------------:|:-------------:|:--------------:|:-----------:|:--------------:|
| Effort | S | S–M | M | M | L |
| Filter “siapa user” | ✗ | ✓ (app) | ✓ | ✓✓ | ✓✓✓ |
| Lindungi dari DP casual | ✓ | ✗/△ | ✓✓ | ✓✓ | ✓✓✓ |
| Lindungi raw URL | △ | ✗ | △ | △ | ✓✓✓ |
| Dampak prospek/SEO | rendah | rendah | sedang | tinggi | sedang–tinggi |
| Butuh backend Motovax | opsional | flag role | role + route | role | besar |
| Cocok digabung | basis semua | + C/D/E | **A+B** | A+B | A+B+C |

---

## 5. Rekomendasi eksekusi bertahap

**Fase 0 (segera, Rencana A — partial)**  
- Watermark wajib di share/download.  
- Matikan download clean di web publik.  
- Kurangi resolusi preview publik.

**Fase 1 (minggu berikutnya, Rencana B + C)**  
- Enforce `is_sales_agent` (atau permission setuju) setelah login.  
- Dual surface: full tools hanya agen; publik teaser.  
- Samakan gate: route `/share` selalu butuh sesi agen (termasuk browser).

**Fase 2 (bila abuse berlanjut, Rencana E)**  
- Signed URL + audit + allowlist program agen di Motovax.

**Tidak disarankan sebagai langkah pertama:** Rencana D murni tanpa landing prospek terpisah — merusak funnel share unit ke pembeli, padahal concern utamanya **foto**, bukan “orang melihat harga”.

---

## 6. Keputusan yang diminta dari manusia

Centang pilihan agar implementasi follow-up bisa start:

1. [ ] Mulai **Fase 0 (A)** sekarang  
2. [ ] Lanjut **B + C** setelah A  
3. [ ] Langsung **D** (portal agen only)  
4. [ ] Rancang **E** bersama tim Motovax API  
5. [ ] Definisi resmi “agen valid”: `is_sales_agent` / permission `…` / allowlist manual  

**Kriteria sukses (usulan):**

- Download/share dari SPA selalu ber-watermark Mobix.  
- User non-agen tidak mendapat full gallery / compose.  
- (Fase 2) Request foto tanpa token/signature ditolak server.

---

## 7. File terkait di repo

- `src/main.tsx` — gerbang User-Agent → login  
- `src/lib/runtime-mode.ts` — deteksi app AgenMobix  
- `src/lib/auth.tsx` — sesi Motovax, field role/agen  
- `src/pages/Login.tsx` — UI login  
- `src/pages/ShareSheet.tsx` — download/share, `includeOverlay: false`  
- `src/lib/mobix.ts` — URL gambar publik + `/share-image`  

---

*Dokumen ini adalah deliverable tugas `/plan`. Implementasi menunggu pilihan manusia.*
