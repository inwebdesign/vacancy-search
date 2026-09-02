# Slobodno — Admin Dashboard

Faza 1, Korak 1: skelet projekta (Next.js App Router + TypeScript + Tailwind + Prisma, prazna šema) — **urađeno i provereno** (`npm install` i build prolaze bez grešaka).

Faza 1, Korak 2: Supabase projekat + konekcija — **urađeno i provereno** (dev projekat kreiran, `prisma db pull` uspešno konektuje na bazu).

Faza 1, Korak 3: `agencies` i `profiles` šema — **urađeno i provereno** (tabele primenjene na dev bazu, potvrđeno u Supabase Table Editor-u). `agencies.status` je enum (`pending`/`active`/`suspended`), dodato drugom migracijom — vidi ispod.

Faza 1, Korak 4: Auth — **urađeno i provereno** (login, invite, MFA enrollment — testirano end-to-end).

Faza 1, Korak 5: RLS na `agencies`/`profiles` — **urađeno i provereno** (primenjeno, testirano sa dva `agency_admin` naloga u različitim agencijama — svaki vidi samo svoju).

Faza 1, Korak 6: middleware za `/admin/*` — **urađeno i provereno** (redirect neulogovanih na `/login`, `next` vraća korisnika nazad posle prijave). MFA enforcement za superadmin/operator namerno nije uključen — vidi napomenu ispod.

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

## Korak 4 — Auth

### Kod (urađeno)

```
src/middleware.ts                    Osvežava Supabase sesiju na svakom request-u
src/app/login/                       Email+password forma + dugme za Google OAuth
src/app/auth/callback/route.ts       Razmenjuje code (OAuth) ili token_hash (invite/magic-link/recovery) za sesiju
src/app/auth/set-password/           Prva stanica posle invite mejla — korisnik postavlja lozinku
src/app/auth/mfa/                    TOTP enrollment (QR kod + potvrda 6-cifrenim kodom)
src/app/auth/logout/route.ts         Odjava
src/app/api/auth/email/route.ts      Supabase Send Email Hook — šalje auth mejlove preko Resend-a (vidi Ručni deo, stavka 3)
```

Nema javne signup forme — jedini način da neko dobije nalog je invite koji šalje superadmin. Za sada se invite šalje ručno kroz Supabase dashboard (Authentication → Users → Invite user) — nije napravljena posebna admin stranica za to u Koraku 4, jer bi bez zaštite ruta (Korak 6) takva stranica bila nezaštićen server-side action sa service_role ovlašćenjima; ta funkcionalnost prirodnije ide uz Korak 6/7 kad postoji role-based pristup.

MFA stranica (`/auth/mfa`) radi enrollment, ali **ništa je trenutno ne primorava** — obavezno MFA za superadmin/operator uloge treba ožičiti kroz `profiles.role` proveru, prirodno mesto je isto middleware koji Korak 6 pravi za `/admin/*` zaštitu (izbegava se duplirana logika).

### Ručni deo — Supabase/Google Cloud (radiš ti, van koda)

1. **Isključi javni signup**: Supabase dashboard → Authentication → Sign In / Providers → Email → isključi "Allow new users to sign up" (naziv opcije zavisi od verzije UI-ja; traži nešto u vezi sa "signups"/"registracijom").
2. **URL Configuration**: Authentication → URL Configuration → `Site URL` postavi na adresu aplikacije (lokalno `http://localhost:3000`, kasnije Vercel domen); u `Redirect URLs` dodaj `<site-url>/auth/callback`.
3. **Invite email redirect preko Send Email Hook-a**: editovanje email template-a (Authentication → Emails) nije dostupno bez Pro plana, pa se umesto toga koristi **Authentication → Hooks → Send Email** hook — Supabase tada POST-uje podatke o mejlu na naš endpoint umesto da sam šalje mejl kroz ugrađeni mailer (koji na free tier-u ima i vrlo mali rate limit).
   - Uključi hook, tip **HTTPS**, URL = `<site-url>/api/auth/email`, generiši **Secret** (`v1,whsec_...` format).
   - Napravi nalog na [Resend](https://resend.com) (besplatan tier), uzmi API key.
   - U `.env.local`/Vercel env popuni: `SUPABASE_AUTH_HOOK_SECRET` (secret iz hook-a), `RESEND_API_KEY`, opciono `EMAIL_FROM` (default `onboarding@resend.dev`, radi bez verifikacije domena za slanje sebi).
   - Endpoint ([src/app/api/auth/email/route.ts](src/app/api/auth/email/route.ts)) verifikuje potpis, gradi link `.../auth/callback?token_hash=...&type=...&next=...` (invite/recovery idu na `/auth/set-password`) i šalje ga preko Resend-a; `/auth/callback` hvata `token_hash`+`type`, zove `verifyOtp`, redirect-uje na `next`.
   - **Napomena**: Supabase Cloud mora da pozove ovaj URL preko javnog HTTPS-a — `localhost` ne radi. Dok se ne uradi prvi deploy (Vercel), invite/recovery mejlovi se ne mogu testirati end-to-end; ostali auth flow-ovi (login, Google OAuth, MFA) rade lokalno nezavisno od ovoga.
4. **Google OAuth provider**: Authentication → Providers → Google → uključi, potreban ti je `Client ID` i `Client Secret` iz [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0 Client, tip "Web application", authorized redirect URI je URL koji Supabase prikaže na toj istoj stranici — oblika `https://<project-ref>.supabase.co/auth/v1/callback`).
5. **Rate limiting na login**: Authentication → Rate Limits → **"Rate limit for sign-ups and sign-ins"** postavljeno na **1 request/5 min po IP** (=12/sat). Brief traži tačno "5 pokušaja/15min po IP+email" (kombinovani ključ, =20/sat) — Supabase-ov ugrađeni limiter radi po IP-u (ne IP+email) i samo u fiksnim 5-min prozorima (20/sat nije deljivo na cele brojeve po 5 min), pa je izabrana strožija vrednost (12/sat) kao gruba aproksimacija, ne tačna specifikacija; precizniji limiter (custom, sa perzistentnim brojačem po IP+email) nije napravljen u Koraku 4 da se ne bi gradila infrastruktura (KV/Redis) koja još nije deo stack-a — ostaje otvoreno za kasnije. Ostala polja na toj stranici (`token verifications`, `token refreshes`, `anonymous users`, `Web3`) ostavljena na default — nisu deo ovog zahteva, a snižavanje `token verifications` bi rizikovalo blokiranje legitimnih klikova na invite/reset/magic-link mejlove.
6. **MFA enforcement politika**: Supabase ima projekt-nivo MFA podešavanja (Authentication → Multi-Factor Authentication) — pogledaj da li tvoja verzija dashboard-a nudi opciju da zahteva MFA za određene korisnike; ako ne, enforcement ostaje na app-level proveri koja se pravi u Koraku 6.

### Provera da radi

*(koraci 1-2 rade tek posle prvog deploy-a — vidi napomenu o hook-u iznad)*

1. Pošalji sebi invite kroz Supabase dashboard (svojim mejlom, sa `agency_id = null`, ulogom `superadmin` — profil moraš ručno uneti u `profiles` tabelu pošto UI za to još ne postoji, videti Table Editor).
2. Klikni link iz mejla → treba da završiš na `/auth/set-password` → postavi lozinku → redirect na `/`.
3. Odjavi se, probaj login sa email+lozinka na `/login`.
4. Probaj i "Prijavi se preko Google-a" dugme (posle koraka 4 iznad).
5. Otvori `/auth/mfa`, skeniraj QR kod i potvrdi da enrollment prolazi.

## Korak 5 — RLS

### Šta politika radi

Dve `SECURITY DEFINER` helper funkcije (`current_profile_role()`, `current_profile_agency_id()`) čitaju ulogovanog korisnika iz `profiles` bez okidanja RLS-a na `profiles` — bez njih bi policy na `profiles` koji čita `profiles` da bi odlučio pristup izazvao beskonačnu rekurziju.

- **agencies** — SELECT: superadmin/operator vide sve, agency_admin/agency_user vide samo svoju agenciju. INSERT/UPDATE/DELETE: samo superadmin (poklapa se sa sekcijom 6 brief-a — "superadmin... upravljanje... CPC cenama").
- **profiles** — SELECT: sopstveni red, kolege iz iste agencije, ili superadmin/operator (svi). INSERT/UPDATE/DELETE: samo superadmin — namerno nema samostalnog uređivanja sopstvenog profila, jer bi to (bez posebne kolonske zaštite koja još ne postoji) otvorilo mogućnost da korisnik sebi promeni `role` ili `agency_id`.

### Primena i test (radiš ti, lokalno)

1. `git pull`, pa `npx prisma migrate deploy` (ista komanda kao pre).
2. Napravi drugi test nalog: invite kroz Supabase dashboard, ulogu `agency_admin`, sa `agency_id` različitim od tvog prvog test naloga (uređuješ direktno u Table Editor-u posle prihvatanja invite-a — nema još UI-ja za ovo).
3. Uloguj se kao prvi `agency_admin` nalog, otvori Supabase **SQL Editor** ili koristi `supabase.auth.getSession()` da izvučeš access token, pa pozovi REST API direktno (`GET {SUPABASE_URL}/rest/v1/agencies` sa `Authorization: Bearer <token>` i `apikey: <anon key>` header-ima) — treba da vidiš SAMO svoju agenciju, ne drugu.
4. Ponovi sa drugim nalogom, potvrdi da vidi samo svoju.
5. Probaj i `profiles` isto — svaki agency_admin treba da vidi samo profile iz svoje agencije (plus sopstveni red).

Ovo je direktno test scenario iz brief-a ("dva različita agency_admin naloga... ni direktnim API pozivom") — testirano sa realnim tokenom, ne pretpostavljeno.

## Korak 6 — middleware za `/admin/*`

### Šta radi

```
src/middleware.ts               Redirect neulogovanih sa /admin/* na /login?next=<putanja>
src/app/admin/page.tsx          Skelet zaštićene rute (samo email + uloga, bez navigacije)
```

- Neulogovan korisnik koji pokuša `/admin` (ili bilo koju `/admin/*` podrutu) biva redirect-ovan na `/login?next=/admin/...`.
- Login flow (email+lozinka i Google) sad čita `next` i vraća korisnika tačno tamo posle uspešne prijave, umesto uvek na `/` — provereno i u `/auth/callback` i u login server action-u, oba validiraju da `next` počinje sa jednim `/` (ne `//`), da se spreči open-redirect kroz taj parametar.
- `AdminPage` server component i sam zove `getUser()` kao odbrana u dubinu — ne oslanja se isključivo na middleware.

**Namerno izostavljeno**: MFA enforcement za superadmin/operator uloge (pomenuto u Koraku 4 kao "prirodno mesto je middleware"). Trenutna `/auth/mfa` stranica radi samo enrollment (upis novog TOTP faktora), ne i challenge/verify postojećeg faktora pri svakom loginu — potrebna je nova stranica za to. Ostaje otvorena stavka za sledeći korak.

### Test (radiš ti, lokalno)

1. Odjavi se, otvori `http://localhost:3000/admin` direktno — treba da te odbaci na `/login?next=%2Fadmin`.
2. Uloguj se (email+lozinka ili Google) — treba da završiš tačno na `/admin`, ne na `/`.
3. Dok si ulogovan, otvori `/admin` ponovo — treba normalno da se prikaže (email + uloga iz `profiles`).

### Napomena — duplirane React verzije (build bug, nepovezano sa ovim korakom)

`npm run build` je pucao sa "Minified React error #31" na `/404` stranici zbog toga što su `apps/site` (React 18) i `apps/admin` (React 19) u monorepo-u dobili nekonzistentno hoistovane kopije `react`/`react-dom` posle jednog ranijeg `npm install --workspace=apps/admin` poziva. Rešeno brisanjem svih `node_modules` foldera i `package-lock.json`, pa svežim `npm install` iz root-a. `package-lock.json` je namerno u `.gitignore` (nema commit-ovan lockfile za monorepo), pa ako se ovo opet pojavi posle instaliranja novog paketa, isti fix (clean reinstall iz root-a) treba da pomogne.

## Sledeći koraci (Faza 1)

- [x] Korak 1: repo i projekat (skelet, provereno)
- [x] Korak 2: Supabase projekat + konekcija (dev projekat, konekcija provereno)
- [x] Korak 3: `agencies` i `profiles` tabele u Prisma šemi + migracija (primenjeno na dev bazu, potvrđeno)
- [x] Korak 4: Auth (email/password + Google, invite-only) — testirano end-to-end
- [x] Korak 5: RLS politike — primenjeno, testirano sa dva `agency_admin` naloga (vidi gore)
- [x] Korak 6: middleware za `/admin/*` — testirano (vidi gore); MFA enforcement ostaje otvoreno
- [ ] Korak 7: role-based navigacija (skelet)
- [ ] Korak 8: audit log
