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

The screens currently render **mock data** in `src/data/catalog.ts`, shaped to
match the Mobix API so the swap to live data is a drop-in:

- `POST /daftar-produk` → catalog grid (`ProductListItem[]`)
- `POST /detail-produk` → unit detail (`ProductDetail`)
- `GET /unit-file-serve?path=…` → unit photos (public)

Base API: `https://mobix.motovax.com` (tenant `mobix`). Those POST endpoints
require a **bearer token** — for a public site it must be proxied via a thin
server-side BFF (token in a server env var), never embedded in client JS. The
`Photo` component already supports a real `src` with a hatch loading/`onError`
fallback; car photos render as the design's diagonal hatch until wired.

The installment calculator (`src/lib/installment.ts`) is a marketing simulation
calibrated to the design defaults (price 165jt, DP 20%, tenor 60 → ~Rp 3.428.000
/ bln). Real quotes come from the leasing partner.

## License

© PT Mobix Mobil Indonesia. All rights reserved.
