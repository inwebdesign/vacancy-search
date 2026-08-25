# Slobodno

Monorepo sa dve aplikacije:

- [`apps/site`](apps/site/README.md) — javna stranica za pretragu slobodnog smeštaja (React + Vite)
- [`apps/admin`](apps/admin/README.md) — interni admin dashboard za agencije (Next.js + Prisma + Supabase)

## Setup

```bash
npm install
```

Instalacija se pokreće jednom iz korena — `npm` workspaces instalira zavisnosti za obe aplikacije.

## Pokretanje

```bash
npm run dev:site    # http://localhost:5173
npm run dev:admin   # http://localhost:3000
```

## Build

```bash
npm run build:site
npm run build:admin
```

Detalji o svakoj aplikaciji (funkcionalnosti, environment varijable, struktura) nalaze se u README fajlu odgovarajućeg foldera.
