# Slobodno — javni sajt

Metasearch za turističke agencije u Srbiji: korisnik pretražuje destinaciju/period/broj gostiju i vidi ponude više agencija jednu pored druge, pa odlazi kod agencije da završi rezervaciju (klik-out, bez plaćanja/rezervacije na platformi). Ponude puni `apps/admin`, sajt ih samo čita.

Plan razvoja (data sloj, Koraci 1-3): [`docs/PLAN-JAVNI-SAJT.md`](../../docs/PLAN-JAVNI-SAJT.md). UI se gradi po fazama iz dizajn handoff-a (README + mockup, van repo-a) prateći `.claude/skills/kreiranje_komponenti/SKILL.md`: **Faza 1** temelji (tokeni, font, UI atomi, header/footer), **Faza 2** početna (Hero, pretraga, "Najtraženije", destinacije, CTA traka), **Faza 3** mobilna doterivanja početne, **Faza 4** rezultati pretrage (`/pretraga`: filter rail, kartice, paginacija, klik-tracking) — sve četiri gotove i vizuelno potvrđene.

## Stack

Next.js 15 (App Router) + TypeScript + **CSS Modules + clsx** (bez Tailwind-a — skill eksplicitno zabranjuje CSS-in-JS/Tailwind, "svaka stilizovana komponenta postaje klijentska"). Isti Next.js/TypeScript stack kao `apps/admin`, ali `apps/admin` zadržava sopstveni Tailwind — dve nezavisne instalacije. Sajt zamenjuje raniji Vite/React prototip sa izmišljenim podacima (ostao u git istoriji).

## Pravilo: browser nikad ne dodiruje bazu

Upiti ka Supabase-u idu **isključivo sa servera** (Server Components / Route Handler-i), preko `src/lib/supabase/public.ts` — fajl ima `import "server-only"`, pa build pada ako ga neko slučajno uveze u client kod. Koristi se `anon` ključ, a baza je stvarna granica: RLS politika `offers_select_public` (migracija `20260920100000_public_offers_select` u `apps/admin/prisma/migrations`) dozvoljava `anon` roli samo čitanje `offers` gde je `status = 'published'`. Nema sesije, nema logina, nema pisanja.

Anon ključ je javan po dizajnu (nalazi se i u admin browser bundle-u), pa baza štiti i kolone: `anon` sme da čita samo 13 kolona `offers` (`id`, `agency_id`, `naziv`, `destinacija`, `datum_polaska`, `datum_povratka`, `cena_eur`, `cena_tip`, `cena_po_osobi`, `max_gostiju`, `dostupno_mesta`, `status`, `updated_at`) i `id`/`naziv` iz `agencies`. Upiti sajta zato moraju da nabrajaju kolone — `select('*')` puca sa `permission denied`. Nova javna kolona traži novu migraciju u `apps/admin`.

## Pokretanje

```bash
npm install                       # iz korena repo-a (npm workspaces)
cp apps/site/.env.example apps/site/.env.local   # popuni Supabase vrednosti (isti projekat kao admin)
npm run dev:site                  # http://localhost:3001
```

Port je 3001 da ne kolidira sa adminom (3000). `SUPABASE_SERVICE_ROLE_KEY` je od Faze 4 obavezan — koristi ga `/go/[offerId]` (klik-tracking) za upis u `clicks` i čitanje `kontakt_url` (anon nema pristup toj koloni).

## Build

```bash
npm run build:site
```

## Struktura

```
src/app/                       layout (header/footer, font), početna ("/"), rezultati ("/pretraga"), klik-tracking ("/go/[offerId]")
src/components/ui/             Deljeni atomi: Button, Badge, Checkbox, AmenityChip, PhotoPlaceholder, SortChips
src/components/layout/         SiteHeader, SiteFooter, NavLink (klijentski list za aktivnu nav stavku)
src/components/marketing/      Hero, HighlightList, OfferRow, DestinationGrid, AgencyCtaBand — početna
src/components/search/         SearchBar, DestinationInput, DateRangeField, GuestsField — deljena traka pretrage
src/components/filters/        PriceRangeFilter, AgencyFilter, FilterRail — filter rail na "/pretraga"
src/components/results/        ResultCard, Pagination, ActiveFilterStrip, ResultsHeader — rezultati pretrage
src/lib/supabase/public.ts     Server-only Supabase klijent (anon ključ, bez sesije)
src/lib/supabase/admin.ts      Server-only Supabase klijent (service_role) — samo za /go/[offerId]
src/lib/offers/params.ts       Čist kod: parsiranje/validacija URL parametara pretrage (uključujući cenaOd/Do, agencija), escapeLike, današnji datum u Srbiji
src/lib/offers/search.ts       Server-only: searchOffers, getAgencyFacets, countOffers, getMinPrice
src/lib/offers/home.ts         Server-only: podaci za početnu (top ponude, statistika po destinaciji)
src/lib/offers/query.ts        Čista funkcija: gradi sledeći URL za /pretraga iz trenutnog query-ja + izmena (koriste je filter komponente)
src/lib/format.ts              Sve formatiranje cena/datuma/množine na jednom mestu (nema ručnog spajanja stringova po komponentama)
src/lib/debounce.ts            debounce za unos pretrage (300ms)
```

## Testovi

```bash
npm run test:site     # iz korena (ili npm test u apps/site)
```

Vitest. Čisti testovi (parsiranje, debounce) rade bez ičega; integracioni testovi pretrage i "ugovor sa bazom" gađaju pravu dev bazu anon ključem, pa traže popunjen `apps/site/.env.local` i bar jednu objavljenu ponudu u bazi. Pretraga je testirana model-based (SQL filter mora da vrati isto što i JS filter nad istim podacima), ne vezano za konkretne brojke u bazi.

Šema baze i migracije žive isključivo u `apps/admin/prisma` — sajt nema Prisma, samo čita preko `supabase-js`.
