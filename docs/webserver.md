# Webserver SPA

Production dapat menjalankan webserver Go di `cmd/webserver`. Server menyajikan
hasil build Vite dari `dist`, menyediakan `GET /healthz`, dan mengembalikan
`index.html` untuk deep link milik router SPA.

Jalankan secara lokal setelah build:

```bash
bun run build
bun run serve
```

Konfigurasi default adalah `ADDR=:8080` dan `STATIC_DIR=dist`. Keduanya dapat
diubah melalui environment variable.

`Dockerfile` melakukan build frontend dan server Go dalam stage terpisah. Image
akhir hanya berisi binary webserver dan aset hasil build, berjalan sebagai user
non-root, serta menyediakan container health check. Isi `VITE_*` yang diperlukan
sebagai build arguments di Coolify.
