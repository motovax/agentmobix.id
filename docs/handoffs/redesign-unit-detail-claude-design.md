# Handoff Redesign Halaman Detail Unit — Claude Design

## Referensi

- Halaman: [Toyota Avanza G M/T 2022](https://agenmobix.id/unit/toyota-avanza-g-mt-2022-9e2a2bf6)
- Platform: AgenMobix
- Target utama: mobile 390–412 px

## Konteks produk

AgenMobix adalah aplikasi mobile-first untuk agen penjualan mobil bekas. Halaman detail unit bukan sekadar halaman produk untuk pembeli, tetapi workspace agen untuk:

1. Memeriksa detail dan kelengkapan unit.
2. Menentukan harga jual kepada klien.
3. Melihat estimasi komisi.
4. Membuat simulasi pembiayaan.
5. Membagikan penawaran kepada klien.
6. Menghubungi admin atau sales jika diperlukan.

Redesign UI/UX halaman ini tanpa menghilangkan business logic yang sudah tersedia.

## Target redesign

- Membuat informasi kendaraan lebih cepat dipindai.
- Menempatkan harga, cicilan, TDP, dan komisi sebagai informasi utama.
- Menyederhanakan kalkulator kredit yang saat ini cukup padat.
- Memperjelas hubungan antara harga jual builder dan estimasi komisi.
- Membuat CTA **Share ke klien** selalu mudah ditemukan.
- Menghasilkan tampilan profesional, tepercaya, modern, dan nyaman dipakai dengan satu tangan.

## Data contoh

| Data | Nilai |
|---|---:|
| Unit | Toyota Avanza G M/T 2022 |
| Harga jual | Rp178.000.000 |
| Estimasi komisi | Rp2.000.000 |
| Simulasi | Reguler |
| Tenor | 60 bulan |
| DP | 25% / Rp44.500.000 |
| Harga kredit | Rp170.124.000 |
| Cicilan | Rp3.530.600 per bulan |
| Total bayar pertama/TDP | Rp50.933.200 |

## Struktur halaman

### 1. Hero dan galeri

- Foto kendaraan besar dengan rasio 4:3.
- Navigasi kembali dan share tampil sebagai floating icon.
- Tampilkan status stok dan nomor plat sebagai badge.
- Tampilkan pagination foto, thumbnail, dukungan video, dan lightbox.
- Foto tetap menjadi fokus visual pertama.

### 2. Ringkasan unit

Tampilkan dengan hierarki yang jelas:

- Nama unit.
- Nomor plat.
- Cabang dan posisi unit.
- Harga jual utama.
- Harga kredit atau TDP yang relevan.
- Estimasi komisi.
- Perubahan harga terhadap harga asli jika agen mengubah harga jual.

Komisi tidak boleh lebih dominan daripada harga kendaraan, tetapi harus tetap mudah ditemukan.

### 3. Harga jual builder

Buat card khusus sebagai tool bisnis agen:

- Input nominal rupiah.
- Harga asli.
- Batas harga minimum.
- Maksimal penurunan harga.
- Tombol reset.
- Perubahan harga langsung memperbarui estimasi komisi.
- Berikan penjelasan ringkas tentang hubungan harga dan komisi, misalnya: _“Naikkan harga jual untuk menambah estimasi komisi.”_

### 4. Spesifikasi utama

Gunakan grid ringkas yang memuat:

- Transmisi
- Kilometer
- Kategori
- Tahun
- Warna
- Nomor plat

Ikon sederhana boleh digunakan bila membantu, tetapi jangan mengandalkan ikon tanpa label.

### 5. Simulasi pembiayaan

Gunakan section yang visually distinct dengan tiga tab:

- Reguler
- DP Minim
- Syariah

#### Reguler

Sediakan pilihan metode simulasi:

- Berdasarkan DP
- Berdasarkan TDP
- Berdasarkan cicilan

Untuk metode DP, tampilkan:

- Input persentase DP.
- Input nominal DP.
- Slider DP.
- Pilihan tenor 12, 24, 36, 48, dan 60 bulan.
- Tombol **Hitung simulasi**.

Prioritas hasil simulasi:

1. Cicilan per bulan.
2. Total bayar pertama.
3. Tenor.
4. Harga kredit.
5. Biaya admin.
6. Status tanpa provisi.

#### DP Minim

Tampilkan perbandingan tenor 36, 48, dan 60 kali. Setiap opsi memuat:

- All In
- Angsuran per bulan
- TDP

Opsi aktif harus jelas. Setelah dipilih, tampilkan detail hasil di bawah daftar.

#### Syariah

Saat ini belum tersedia. Tampilkan empty state **Segera hadir** yang rapi dan tidak terlihat seperti error.

#### State yang wajib didesain

- Initial/loading dari DSF.
- Sedang menghitung.
- Hasil berhasil.
- Gagal menghitung dengan tombol **Hitung ulang**.
- Pembiayaan DSF tidak tersedia untuk unit.
- Data belum lengkap.
- Share belum dapat dilakukan karena simulasi belum siap.
- Syariah segera hadir.
- Foto atau video tidak tersedia.

Untuk unit yang tidak eligible DSF, tampilkan penjelasan singkat dan CTA **Tanya opsi pembiayaan lain**.

### 6. Kelengkapan dokumen

- Status tersedia menggunakan check hijau/teal.
- Status tidak tersedia menggunakan indikator merah.
- Informasi BPKB harus tetap menjaga privasi nama pemilik.

### 7. Deskripsi unit

Tampilkan teks yang nyaman dibaca. Gunakan pola **Lihat selengkapnya** jika kontennya panjang.

### 8. Rekomendasi unit lain

Tampilkan unit serupa dalam compact cards atau horizontal carousel. Bagian ini tidak boleh bersaing dengan CTA utama.

### 9. Sticky action bar

Sticky CTA selalu tersedia di bawah:

- Primary: **Share ke klien**.
- Secondary: hubungi admin atau minta hitungan.

Pertimbangkan safe-area perangkat iOS. Sticky bar tidak boleh menutupi konten atau kontrol kalkulator.

## Arahan visual

Pertahankan identitas AgenMobix:

| Token | Nilai |
|---|---|
| Ink/dark navy | `#0E1B1E` |
| Primary teal | `#1ECFCB` |
| Deep teal | `#0FA8A4` |
| Background | `#E9ECEF` |
| Surface | `#FFFFFF` |
| Field | `#F6F8F9` |
| Border | `#E2E4E7` |
| Muted text | `#6B7E83` |
| Danger | `#B33D1A` |
| Font | Plus Jakarta Sans |

Karakter visual:

- Profesional dan tepercaya.
- Clean, tetapi tidak terasa kosong.
- Data finansial mudah dibandingkan.
- Hierarki card jelas.
- Radius dan shadow moderat.
- Hindari terlalu banyak pill, border, dan container bertumpuk.
- Gunakan teal untuk highlight dan success, bukan memenuhi seluruh halaman.
- Gunakan spacing dan tipografi untuk membentuk hierarki.

## Responsive dan accessibility

- Prioritaskan viewport mobile 390–412 px.
- Pada desktop, tampilkan sebagai centered app frame dengan lebar maksimal sekitar 412 px.
- Semua target sentuh minimal 44 px.
- Tidak boleh ada horizontal overflow.
- Angka rupiah panjang tidak boleh terpotong.
- Sticky CTA aman terhadap browser chrome dan safe-area.
- Jangan mengandalkan warna sebagai satu-satunya penanda status.
- Pertahankan label yang jelas untuk seluruh input dan action.

## Jangan diubah

- Logika kalkulasi dan integrasi DSF.
- Batas DP dan harga jual.
- Perhitungan estimasi komisi.
- Tab Reguler, DP Minim, dan Syariah.
- Kemampuan share.
- Dukungan galeri foto/video.
- Status pembiayaan dan error.
- Privasi informasi BPKB.
- Bahasa antarmuka tetap Bahasa Indonesia.

## Output yang diminta dari Claude Design

Buat high-fidelity mobile design lengkap untuk:

1. Default state dengan hasil simulasi Reguler.
2. State edit harga jual builder.
3. State DP Minim.
4. State loading simulasi.
5. State error DSF.
6. State unit tidak eligible pembiayaan.
7. State Syariah **Segera hadir**.

Gunakan data contoh di atas agar desain memperlihatkan angka realistis. Fokus pada desain halaman detail unit, bukan merombak navigasi global aplikasi.

## Acceptance criteria

- Harga, cicilan, TDP, dan komisi dapat dipindai tanpa membaca seluruh halaman.
- Pengguna memahami bahwa harga jual builder memengaruhi estimasi komisi.
- Pengguna dapat berpindah metode dan tenor simulasi tanpa kebingungan.
- State loading, error, unavailable, dan coming soon memiliki perlakuan berbeda.
- CTA share dan kontak selalu mudah dijangkau.
- Desain dapat diterapkan ke React/Tailwind yang sudah ada tanpa mengubah business logic.
