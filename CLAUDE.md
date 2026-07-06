# agenmobix.id — Panduan Proyek

## Arsitektur

- **Frontend**: React SPA → deploy ke GitHub Pages (`agenmobix.id`)
- **API Proxy**: Cloudflare Worker (`agentmobix-api.margi-landshark.workers.dev`) — inject Bearer token ke Mobix API, tambah CORS headers
- **Data Source**: Mobix API eksternal (`https://mobix.motovax.com`) — tidak ada backend sendiri

## Cara Deploy

### Frontend (GitHub Pages)
Auto-trigger setiap push ke `main`. Untuk trigger manual:
```
gh workflow run deploy.yml
```

Jika agen melakukan `push` ke `main`, jangan berhenti di `git push` saja. Selalu lanjutkan dengan:
- cek status workflow deploy GitHub Pages,
- jika deploy gagal atau tidak jalan, trigger ulang `deploy.yml`,
- verifikasi hasil deploy sebelum handoff ke user.

### Cloudflare Worker (`worker/`)
Auto-trigger setiap push ke `main` yang mengubah file di `worker/`. Untuk trigger manual:
```
gh workflow run deploy-worker.yml
```

## Secrets & Variables

Tersimpan di **GitHub repo → Settings → Secrets and variables → Actions**.

### Secrets
| Nama | Keterangan |
|---|---|
| `MOBIX_API_KEY` | Bearer token Mobix API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare token dengan permission "Edit Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare (`a125f8b2e10c6ed7f7f24fa96092faec`) |

### Variables
| Nama | Nilai |
|---|---|
| `VITE_MOBIX_PROXY` | `https://agentmobix-api.margi-landshark.workers.dev` |
| `VITE_MOBIX_IMAGE_BASE` | `https://mobix.motovax.com` (opsional, ini default-nya) |

## Environment Lokal

Salin `.env.example` ke `.env` dan isi nilainya:
```
MOBIX_API_KEY=<token>
MOBIX_API_BASE=https://mobix.motovax.com
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_ACCOUNT_ID=<account_id>
```

Jalankan dev server:
```
bun install
bun run dev
```

## Catatan Penting

- `VITE_MOBIX_PROXY` wajib di-set sebelum deploy frontend, jika kosong semua API call di production akan gagal.
- CORS di `worker/index.js` hanya mengizinkan origin `agenmobix.id` dan `localhost`. Jika domain berubah, update `ALLOWED_ORIGINS` di Worker lalu re-deploy.
- API key tidak pernah masuk ke bundle JS — selalu di-inject di sisi Worker/Vite proxy.
