# Slobodno — javni sajt

Metasearch za turističke agencije u Srbiji: korisnik pretražuje destinaciju/period/broj gostiju i vidi ponude više agencija jednu pored druge, pa odlazi kod agencije da završi rezervaciju (klik-out, bez plaćanja/rezervacije na platformi). Ponude puni `apps/admin`, sajt ih samo čita.

Plan razvoja: [`docs/PLAN-JAVNI-SAJT.md`](../../docs/PLAN-JAVNI-SAJT.md). **Trenutno stanje: Korak 2 (skelet)** — prazna početna stranica, konekcija ka bazi spremna; pretraga i UI dolaze u sledećim koracima (UI čeka dizajn sistem).

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind — isti stack kao `apps/admin`. Sajt zamenjuje raniji Vite/React prototip sa izmišljenim podacima (ostao u git istoriji).

## Pravilo: browser nikad ne dodiruje bazu

Upiti ka Supabase-u idu **isključivo sa servera** (Server Components / Route Handler-i), preko `src/lib/supabase/public.ts` — fajl ima `import "server-only"`, pa build pada ako ga neko slučajno uveze u client kod. Koristi se `anon` ključ, a baza je stvarna granica: RLS politika `offers_select_public` (migracija `20260920100000_public_offers_select` u `apps/admin/prisma/migrations`) dozvoljava `anon` roli samo čitanje `offers` gde je `status = 'published'`. Nema sesije, nema logina, nema pisanja.

## Pokretanje

```bash
npm install                       # iz korena repo-a (npm workspaces)
cp apps/site/.env.example apps/site/.env.local   # popuni Supabase vrednosti (isti projekat kao admin)
npm run dev:site                  # http://localhost:3001
```

Port je 3001 da ne kolidira sa adminom (3000). `SUPABASE_SERVICE_ROLE_KEY` treba tek od Koraka 5 (klik-tracking) — do tada ostaje prazan.

## Build

```bash
npm run build:site
```

## Struktura

```
src/app/                   Next.js App Router (layout, početna)
src/lib/supabase/public.ts Server-only Supabase klijent (anon ključ, bez sesije)
```

Šema baze i migracije žive isključivo u `apps/admin/prisma` — sajt nema Prisma, samo čita preko `supabase-js`.
