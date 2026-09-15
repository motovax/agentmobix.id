## Perilaku

Foto mobil pada kartu katalog, galeri detail, lightbox, dan halaman share menjalankan deteksi plat otomatis. Area yang terdeteksi ditutupi mosaik kasar dan blur sebelum gambar ditampilkan. Foto asli tidak ditampilkan selama proses atau ketika gagal; tombol Coba lagi tersedia. Foto tanpa deteksi tetap ditampilkan dengan keterangan pada foto besar.

File foto untuk share/download (hasil komposisi backend, fallback lokal, dan Foto AI) juga diproses. Video, tautan halaman eksternal, preview Open Graph dari server lain, dan file asli di penyimpanan Mobix tidak diubah. Membagikan tautan ke website lain mengikuti gambar dari website tersebut.

## Implementasi

Model YOLOv8n ONNX mendeteksi lokasi plat tanpa membaca nomor. Runtime dan model dilayani dari origin aplikasi, dimuat saat diperlukan; gambar tidak dikirim ke penyedia AI tambahan. Inferensi berjalan pada Web Worker WASM satu thread. Hasil dipakai ulang antarthumbnail/galeri, cache dibatasi 40 entri dan 24 MiB hasil yang sudah selesai. Foto di luar viewport belum diproses.

Model menerima RGB 640×640 dengan letterbox. Ambang keyakinan 0,3; deteksi duplikat dihapus dengan IoU 0,45; margin memperluas area untuk menutupi tepi plat. Sumber model, revisi, checksum, dan lisensi terdapat pada public/models/README.md.

Saat dev/build, scripts/prepare-plate-assets.mjs menyalin runtime dari dependency terkunci ke public/plate-runtime/v1. Tidak ada unduhan model eksternal saat build atau saat pengguna membuka foto. Unduhan pertama runtime + model sekitar 24 MB; koneksi/perangkat memengaruhi waktu proses awal.

## Verifikasi

- `bun test`: 172 tes lulus, termasuk koordinat letterbox, margin, duplikat, beberapa plat, skor rendah, dan pencegahan tampilnya foto asli sebelum pemeriksaan.
- `bun run build`: TypeScript dan produksi Vite lulus. Sandbox ini menggunakan ESBUILD_BINARY_PATH ke esbuild-wasm lokal karena binary native tidak dapat membaca filesystem; pipeline CI tetap memakai build normal.
- Chromium: tiga foto nyata dari katalog (Avanza, Mobilio, dan unit ketiga) berhasil mendeteksi dan memburamkan plat utama; masing-masing menghasilkan 2, 1, dan 1 area.
- Gambar sintetis: plat terdeteksi dan piksel pada area plat berubah; gambar polos menghasilkan nol deteksi dan blob tidak berubah.
- Uji UI mobile memakai respons detail/foto nyata yang direkam dan layanan pembiayaan dimock: 6 gambar hasil blob tampil, 0 gambar asli unit-file-serve dipasang ke DOM. Fallback komposisi lokal berjalan. Ini bukan tes transaksi share WhatsApp sungguhan.
- CORS gambar dari origin produksi https://agenmobix.id: HTTP 200, Access-Control-Allow-Origin sesuai.

- Verifikasi produksi Chromium tanpa mock pada https://agenmobix.id/share: 6 gambar blob tampil, tidak ada gambar asli unit-file-serve di DOM, dan tombol download menghasilkan JPEG dengan plat utama diblur.
- Deployment implementasi commit 1d8e674 berhasil melalui GitHub Pages (run 34940806734). API Coolify mengembalikan 403 saat pemeriksaan; tidak ada aplikasi Coolify lain yang diubah.

## Batasan

Deteksi probabilistik dapat melewatkan plat kecil, jauh di latar, tertutup, atau pada sudut ekstrem, dan dapat memberi positif palsu. Pada sampel Avanza, plat utama berhasil diblur tetapi salah satu plat jauh di latar terlewat. Pengguna perlu memeriksa hasil sebelum membagikan; fitur ini tidak menjamin seluruh plat selalu terdeteksi. Belum ada alat koreksi area manual.
