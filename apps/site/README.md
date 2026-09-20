# Slobodno — javni sajt

Metasearch za turističke agencije u Srbiji: korisnik pretražuje destinaciju/period/broj gostiju i vidi ponude više agencija jednu pored druge, pa odlazi kod agencije da završi rezervaciju (klik-out, bez plaćanja/rezervacije na platformi). Ponude puni `apps/admin`, sajt ih samo čita.

Plan razvoja: [`docs/PLAN-JAVNI-SAJT.md`](../../docs/PLAN-JAVNI-SAJT.md). **Trenutno stanje: Korak 3 (data sloj)** — pretraga ponuda je gotova i testirana (`searchOffers`), ali nema UI-ja: početna je placeholder, UI čeka dizajn sistem (Korak 4).

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind — isti stack kao `apps/admin`. Sajt zamenjuje raniji Vite/React prototip sa izmišljenim podacima (ostao u git istoriji).

## Pravilo: browser nikad ne dodiruje bazu

Upiti ka Supabase-u idu **isključivo sa servera** (Server Components / Route Handler-i), preko `src/lib/supabase/public.ts` — fajl ima `import "server-only"`, pa build pada ako ga neko slučajno uveze u client kod. Koristi se `anon` ključ, a baza je stvarna granica: RLS politika `offers_select_public` (migracija `20260920100000_public_offers_select` u `apps/admin/prisma/migrations`) dozvoljava `anon` roli samo čitanje `offers` gde je `status = 'published'`. Nema sesije, nema logina, nema pisanja.

Anon ključ je javan po dizajnu (nalazi se i u admin browser bundle-u), pa baza štiti i kolone: `anon` sme da čita samo 11 kolona `offers` (`id`, `agency_id`, `naziv`, `destinacija`, `datum_polaska`, `datum_povratka`, `cena_eur`, `max_gostiju`, `dostupno_mesta`, `status`, `updated_at`) i `id`/`naziv` iz `agencies`. Upiti sajta zato moraju da nabrajaju kolone — `select('*')` puca sa `permission denied`. Nova javna kolona traži novu migraciju u `apps/admin`.

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
src/lib/offers/params.ts   Čist kod: parsiranje/validacija URL parametara pretrage, escapeLike, današnji datum u Srbiji
src/lib/offers/search.ts   Server-only: searchOffers() — pretraga objavljenih ponuda (najjeftinije prvo, 20 po strani)
src/lib/debounce.ts        debounce za unos pretrage (300ms), koristi ga UI u Koraku 4
```

## Testovi

```bash
npm run test:site     # iz korena (ili npm test u apps/site)
```

Vitest. Čisti testovi (parsiranje, debounce) rade bez ičega; integracioni testovi pretrage i "ugovor sa bazom" gađaju pravu dev bazu anon ključem, pa traže popunjen `apps/site/.env.local` i bar jednu objavljenu ponudu u bazi. Pretraga je testirana model-based (SQL filter mora da vrati isto što i JS filter nad istim podacima), ne vezano za konkretne brojke u bazi.

Šema baze i migracije žive isključivo u `apps/admin/prisma` — sajt nema Prisma, samo čita preko `supabase-js`.
