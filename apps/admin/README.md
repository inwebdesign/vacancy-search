# Slobodno — Admin Dashboard

Faza 1, Korak 1: skelet projekta (Next.js App Router + TypeScript + Tailwind + Prisma, prazna šema) — **urađeno i provereno** (`npm install` i build prolaze bez grešaka).

Faza 1, Korak 2: Supabase projekat + konekcija — **urađeno i provereno** (dev projekat kreiran, `prisma db pull` uspešno konektuje na bazu).

Faza 1, Korak 3: `agencies` i `profiles` šema — **migracija pripremljena u repo-u, čeka se primena na dev bazu (vidi ispod).**

## Setup

```bash
npm install
cp .env.example .env.local   # popuni DATABASE_URL i Supabase ključeve
npx prisma generate
npm run dev
```

Otvori http://localhost:3000 — treba da vidiš placeholder stranicu "Slobodno — Admin".

## Struktura

```
src/app/          Next.js App Router stranice
src/lib/supabase/client.ts   Supabase klijent za Client Component-e (browser)
src/lib/supabase/server.ts   Supabase klijent za Server Component-e/actions (cookie-based sesija)
src/lib/supabase/admin.ts    Service-role klijent, isključivo server-side (zaobilazi RLS)
src/lib/prisma.ts        Prisma klijent (singleton, izbegava previše konekcija u dev-u)
prisma/schema.prisma   Prisma šema (agencies, profiles — Korak 3)
prisma/migrations/     Istorija migracija, tracked kroz git
.env.example       Šablon za environment varijable (NIKAD ne commit-uj .env.local)
```

## Korak 2 — ručni deo (radiš ti, van koda)

Ovo zahteva pristup Supabase nalogu, pa ne može da se automatizuje iz sesije:

1. **Napravi DVA Supabase projekta** — jedan za dev, jedan za prod (Free tier je dovoljan za Fazu 1, videti napomenu o Pro tier-u ispod).
2. U svakom projektu: dugme **Connect** (vrh stranice projekta) → tab **ORM** → izaberi **Prisma** → kopiraj obe ponuđene vrednosti: transaction-mode pooler ide u `DATABASE_URL`, session-mode pooler (za migracije) ide u `DIRECT_URL`.
3. **Project Settings → Data API**: `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon public` ključ → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `service_role` ključ → `SUPABASE_SERVICE_ROLE_KEY` (**nikad** u client kod, nikad u git — samo u `.env.local` lokalno i u Vercel env varijablama za deploy).
4. Kopiraj `.env.example` u `.env.local` i popuni svih pet vrednosti za dev projekat. Napravi i običan `.env` (isti sadržaj, ili bar `DATABASE_URL`/`DIRECT_URL`) — **Prisma CLI čita samo `.env`, ne `.env.local`** (to čita Next.js runtime); oba fajla su u `.gitignore`.
5. Proveri konekciju: `npx prisma db pull`. Poruka `P4001 The introspected database was empty` je **očekivana i znači da konekcija radi** — baza je namerno prazna do Koraka 3, komanda samo potvrđuje da se `DATABASE_URL`/`DIRECT_URL` uspešno povezuju.
6. Pre nego što prva prava agencija počne svakodnevno da koristi sistem, nadogradi produkcioni projekat na **Supabase Pro** (Free tier nema backup i pauzira se posle 7 dana neaktivnosti).

Kod je već spreman da čita ove varijable čim se popune — nema dodatnih izmena potrebnih posle ovog koraka.

## Korak 3 — primena migracije (radiš ti, lokalno)

Migracija (`prisma/migrations/20260828142855_create_agencies_profiles/`) je već napisana i u repo-u — generisana je offline (`prisma migrate diff`, bez potrebe za konekcijom), pa je ova sesija nije mogla sama primeniti na tvoju bazu jer nema tvoje kredencijale. Ti to radiš lokalno:

1. Povuci najnoviji `claude/vacancy-search-dashboard-upgrade-dcps3w` (`git pull`).
2. Proveri da ti `apps/admin/.env` ima ispravne `DATABASE_URL` i `DIRECT_URL` (iz Koraka 2).
3. Primeni migraciju: `npx prisma migrate deploy` — ovo primenjuje SQL fajl koji je već u repo-u, bez ponovnog generisanja (deterministički, bez shadow baze).
4. Proveri: `npx prisma db pull` sada treba da prepozna `agencies` i `profiles` (bez P4001 greške), ili otvori Supabase **Table Editor** i vizuelno potvrdi da tabele postoje.
5. Regeneriši klijent: `npx prisma generate`.

Napomena o šemi: `profiles.id` ima realnu FK referencu ka `auth.users.id` (Supabase Auth tabela, van Prisma-inog upravljanja) — to je ručno dodato u `migration.sql` jer Prisma po defaultu ne generiše veze ka `auth` šemi. `profiles.agency_id` je opciono (superadmin/operator ne pripadaju jednoj agenciji). `agencies.status` i dalje je slobodan tekst (nije enum) — brief ne definiše dozvoljene vrednosti za taj konkretan slučaj, pa nije proizvoljno pretpostavljeno; to ostaje otvoreno pitanje za kasnije.

## Sledeći koraci (Faza 1)

- [x] Korak 1: repo i projekat (skelet, provereno)
- [x] Korak 2: Supabase projekat + konekcija (dev projekat, konekcija provereno)
- [ ] Korak 3: `agencies` i `profiles` tabele u Prisma šemi + migracija — kod u repo-u, čeka se primena na dev bazu (vidi gore)
- [ ] Korak 4: Auth (email/password + Google, invite-only)
- [ ] Korak 5: RLS politike
- [ ] Korak 6: middleware za `/admin/*`
- [ ] Korak 7: role-based navigacija (skelet)
- [ ] Korak 8: audit log
