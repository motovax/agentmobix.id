# Mobix Agent — Landing App (`agentmobix.id`)

Mobile-first landing app for the **Program Keagenan Mobix** (Mobix agent
program). A registered agent can browse a catalog of ready-to-sell used cars,
see per-unit commission and installment packages, share a unit to their network,
chat with **AI Mobix**, and register as an agent.

Recreated faithfully from the design handoff (_Mini Katalog Real-Time / Mobix
Agent Program_) as a React web app.

## Stack

- **React 19** + **TypeScript**
- **Vite 6** build tooling
- **Tailwind CSS 3** with the design tokens baked into `tailwind.config.js`
- **wouter** for routing
- **Bun** as the package manager / runtime
- Fonts: **Plus Jakarta Sans** + **Newsreader** (Google Fonts)

## Getting started

```bash
bun install
bun run dev        # start the dev server
bun run build      # typecheck + production build to dist/
bun run preview    # preview the production build
bun run typecheck  # type-check only
```

## Screens

| Route          | Screen           | Notes                                                   |
| -------------- | ---------------- | ------------------------------------------------------- |
| `/`            | Beranda          | Home + bottom tab bar, hero, live catalog, AI card      |
| `/katalog`     | Katalog          | Searchable list, category filter chips                  |
| `/unit/:slug`  | Unit Detail      | Gallery, spec grid, **live installment calculator**     |
| `/daftar`      | Daftar Agen      | 3-step agent registration form                          |
| `/ai`          | AI Mobix Chat    | Assistant chat with quick-action chips                  |
| `/hot-deals`   | Hot Deals        | Discounted units + extra commission                     |
| `/lokasi`      | Lokasi           | Branch directory + faux map                             |
| `/share?u=…`   | Share Sheet      | Bottom-sheet share modal (WhatsApp / IG / FB / MP)      |

## Design tokens

Colors, typography, spacing, and radii follow the handoff spec and live in
`tailwind.config.js` (`ink`, `teal`, `teal-deep`, `surface-*`, `danger`, …) and
`src/index.css`.

## Data & API

Vehicle listings are **live from the Mobix API** (`src/lib/mobix.ts`):

- `POST /daftar-produk` → catalog grid (`ProductListItem[]`) — Katalog, Beranda, Hot Deals
- `POST /detail-produk` → unit detail (`ProductDetail`) — Unit Detail, Share Sheet
- `GET /unit-file-serve?path=…` → unit photos (public)

Base API: `https://mobix.motovax.com` (tenant `mobix`). The POST endpoints
require a **bearer token** which must stay server-side, never in client JS.

- **Local dev:** the Vite dev server proxies `/api/mobix/*` → the Mobix API and
  injects `Authorization: Bearer <MOBIX_API_KEY>` from `.env` (gitignored). See
  `vite.config.ts`. Copy `.env.example` → `.env` and set `MOBIX_API_KEY`.
- **Production:** this is a static SPA, so you must run an equivalent reverse
  proxy / serverless function that injects the token for `/api/mobix/*` and
  forwards `/unit-file-serve`. Do **not** embed the token in the bundle.

Only `UNIT READY` units are returned (server-filtered). The catalog API has **no
commission field** — `Komisi` shown in the agent UI is an estimate
(`estimateKomisi`, ~3.4% of price). Testimonials and the branch directory
(`src/data/catalog.ts`) are static program content with no API source. Cards use
loading skeletons + image `onError` fallback to the design's hatch placeholder.

The installment calculator (`src/lib/installment.ts`) is a marketing simulation
calibrated to the design defaults (price 165jt, DP 20%, tenor 60 → ~Rp 3.428.000
/ bln). Real quotes come from the leasing partner.

## Deployment — GitHub Pages + Cloudflare Worker

The app is a static SPA deployed to **GitHub Pages** (`.github/workflows/deploy.yml`,
on push to `main`). Because Pages is static and the Mobix API has no CORS, the
authed API is fronted by a tiny **Cloudflare Worker** (`worker/`) that holds the
token as a secret and adds CORS. Images load directly (public, no CORS needed).

**One-time setup:**

1. **Deploy the Worker** (holds the token):
   ```bash
   cd worker
   npx wrangler secret put MOBIX_API_KEY   # paste the Mobix bearer token
   npx wrangler deploy
   ```
   Note the deployed URL (e.g. `https://agentmobix-api.<sub>.workers.dev`), or
   bind a custom domain like `api.agentmobix.id` in the Cloudflare dashboard.

2. **Point the build at the Worker** — in the GitHub repo:
   _Settings → Secrets and variables → Actions → Variables_, add
   `VITE_MOBIX_PROXY = <your Worker URL>`.
   (Optionally `VITE_MOBIX_IMAGE_BASE`; defaults to `https://mobix.motovax.com`.)

3. **Enable Pages** — _Settings → Pages → Build and deployment → Source:
   **GitHub Actions**_. The custom domain `agentmobix.id` is set via the
   committed `public/CNAME`.

4. **DNS for `agentmobix.id`** — at your registrar, point the apex domain at
   GitHub Pages:
   - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` → `2606:50c0:8000::153`, `:8001::153`, `:8002::153`, `:8003::153`
   - (or an `ALIAS`/`ANAME` to `motovax.github.io`)

   Re-run the workflow (or push to `main`) to deploy. Pages issues HTTPS once DNS
   resolves; tick "Enforce HTTPS" in Settings → Pages.

## License

© PT Mobix Mobil Indonesia. All rights reserved.
