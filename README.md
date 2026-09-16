# HSSS Retail (DIY)

Mobile-first PWA for homeowners to design a shower screen, see a supply-only price (freight excluded), and send the design to Hydro Seal Shower Systems.

**Stack:** Next.js 15, React, TypeScript, Tailwind, Supabase, Serwist (PWA)

The configurator and diagram are the same as the builder app. Quote screens always use **Supply Only** pricing.

## Setup

```bash
npm install
cp .env.example .env
```

Set in `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3002`)
- `RETAIL_QUOTES_INBOX`
- `RESEND_API_KEY`

Apply SQL migrations:

```bash
npm run db:migrate
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server on port 3002 |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations (needs `SUPABASE_DB_URL`) |
