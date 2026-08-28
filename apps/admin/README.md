# Slobodno — Admin Dashboard

Faza 1, Korak 1: skelet projekta (Next.js App Router + TypeScript + Tailwind + Prisma, prazna šema) — **urađeno i provereno** (`npm install` i build prolaze bez grešaka).

Faza 1, Korak 2: Supabase projekat + konekcija — **urađeno i provereno** (dev projekat kreiran, `prisma db pull` uspešno konektuje na bazu).

Faza 1, Korak 3: `agencies` i `profiles` šema — **urađeno i provereno** (tabele primenjene na dev bazu, potvrđeno u Supabase Table Editor-u). `agencies.status` je enum (`pending`/`active`/`suspended`), dodato drugom migracijom — vidi ispod.

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

Migracije su napisane i u repo-u — generisane offline (`prisma migrate diff`, bez potrebe za konekcijom), pa ih ova sesija nije mogla sama primeniti na tvoju bazu jer nema tvoje kredencijale. Ti to radiš lokalno, posle svakog `git pull`:

1. Proveri da ti `apps/admin/.env` ima ispravne `DATABASE_URL` i `DIRECT_URL` (iz Koraka 2).
2. Primeni migracije: `npx prisma migrate deploy` — primenjuje SQL fajlove koji su već u repo-u, bez ponovnog generisanja (deterministički, bez shadow baze). Uzima sve migracije koje još nisu primenjene, pa je ova komanda ista i za prvu i za svaku narednu migraciju.
3. Proveri u Supabase **Table Editor** da su tabele/kolone kako treba (`prisma db pull` neće raditi čisto zbog cross-schema FK ka `auth.users` — vidi napomenu ispod).
4. Regeneriši klijent: `npx prisma generate`.

**Migracije do sad:**
- `20260828142855_create_agencies_profiles` — kreira `agencies` i `profiles`.
- `20260828150325_agency_status_enum` — menja `agencies.status` iz teksta u enum (`pending`/`active`/`suspended`); odluka doneta u razgovoru posle Koraka 3, brief nije precizirao vrednosti.

Napomena o šemi: `profiles.id` ima realnu FK referencu ka `auth.users.id` (Supabase Auth tabela, van Prisma-inog upravljanja) — to je ručno dodato u `migration.sql` jer Prisma po defaultu ne generiše veze ka `auth` šemi (zbog toga `prisma db pull` baca `P4002` grešku — očekivano, provera se radi kroz Table Editor umesto). `profiles.agency_id` je opciono (superadmin/operator ne pripadaju jednoj agenciji).

## Sledeći koraci (Faza 1)

- [x] Korak 1: repo i projekat (skelet, provereno)
- [x] Korak 2: Supabase projekat + konekcija (dev projekat, konekcija provereno)
- [x] Korak 3: `agencies` i `profiles` tabele u Prisma šemi + migracija (primenjeno na dev bazu, potvrđeno)
- [ ] Korak 4: Auth (email/password + Google, invite-only)
- [ ] Korak 5: RLS politike
- [ ] Korak 6: middleware za `/admin/*`
- [ ] Korak 7: role-based navigacija (skelet)
- [ ] Korak 8: audit log
