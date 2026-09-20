# Slobodno

Monorepo sa dve aplikacije:

- [`apps/site`](apps/site/README.md) — javni sajt za pretragu ponuda agencija (Next.js + Supabase, čita bazu samo sa servera)
- [`apps/admin`](apps/admin/README.md) — interni admin dashboard za agencije (Next.js + Prisma + Supabase)

Plan uvezivanja javnog sajta sa bazom: [`docs/PLAN-JAVNI-SAJT.md`](docs/PLAN-JAVNI-SAJT.md).

## Setup

```bash
npm install
```

Instalacija se pokreće jednom iz korena — `npm` workspaces instalira zavisnosti za obe aplikacije.

## Pokretanje

```bash
npm run dev:site    # http://localhost:3001
npm run dev:admin   # http://localhost:3000
```

## Build

```bash
npm run build:site
npm run build:admin
```

Detalji o svakoj aplikaciji (funkcionalnosti, environment varijable, struktura) nalaze se u README fajlu odgovarajućeg foldera.
