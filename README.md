# Mobix Agent Landing App (`agenmobix.id`)

Mobile-first React app for the Mobix agent program. Agents can browse ready-to-sell
used cars, view commission estimates and installment packages, share units, chat
with AI Mobix, and register as an agent.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3
- wouter routing
- Bun package manager/runtime

## Getting Started

```bash
bun install
cp .env.example .env
bun run dev
bun run build
```

## Data & API

The app calls each API origin directly from browser JavaScript:

- Mobix inventory: `https://mobix.motovax.com`
- Strapi CMS: `https://api.mobixbydss.id/api`
- Credit simulation: `https://mobix.motovax.com/kalkulator/allparams`

The Mobix API key is a public Developer API key generated in Motovax. Its access
is controlled by scopes, product fields, and CORS origins in the Developer API
settings on `mobix.motovax.com`.

Required env values:

```bash
VITE_MOBIX_API_KEY=
VITE_MOBIX_API_BASE=https://mobix.motovax.com
VITE_MOBIX_IMAGE_BASE=https://mobix.motovax.com
VITE_STRAPI_API_KEY=
VITE_CMS_API_BASE=https://api.mobixbydss.id/api
VITE_CMS_IMAGE_BASE=https://api.mobixbydss.id
```

## Deployment

The app is a static SPA deployed to GitHub Pages via
[deploy.yml](.github/workflows/deploy.yml). Configure the same `VITE_*` values as
GitHub Actions repository variables. No Cloudflare Worker or reverse proxy is
required.

`public/CNAME` sets the custom domain. DNS for `agenmobix.id` should point to
GitHub Pages.

## License

Copyright PT Mobix Mobil Indonesia. All rights reserved.
