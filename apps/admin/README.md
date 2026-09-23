# Slobodno — Admin Dashboard

Faza 1, Korak 1: skelet projekta (Next.js App Router + TypeScript + Tailwind + Prisma, prazna šema) — **urađeno i provereno** (`npm install` i build prolaze bez grešaka).

Faza 1, Korak 2: Supabase projekat + konekcija — **urađeno i provereno** (dev projekat kreiran, `prisma db pull` uspešno konektuje na bazu).

Faza 1, Korak 3: `agencies` i `profiles` šema — **urađeno i provereno** (tabele primenjene na dev bazu, potvrđeno u Supabase Table Editor-u). `agencies.status` je enum (`pending`/`active`/`suspended`), dodato drugom migracijom — vidi ispod.

Faza 1, Korak 4: Auth — **urađeno i provereno** (login, invite, MFA enrollment — testirano end-to-end).

Faza 1, Korak 5: RLS na `agencies`/`profiles` — **urađeno i provereno** (primenjeno, testirano sa dva `agency_admin` naloga u različitim agencijama — svaki vidi samo svoju).

Faza 1, Korak 6: middleware za `/admin/*` — **urađeno i provereno** (redirect neulogovanih na `/login`, `next` vraća korisnika nazad posle prijave). MFA enforcement za superadmin/operator namerno nije uključen — vidi napomenu ispod.

Faza 1, Korak 7: role-based navigacija + Tim — **urađeno i provereno** (nav skelet, 6 sekcija filtriranih po ulozi; pune CRUD funkcije na "Tim", ostalo placeholder do Faze 2).

Faza 1, Korak 8: Audit log — **urađeno i provereno**. Loguje Tim akcije (invite/role_change/remove); vidljivo samo superadmin/operator-u.

---

Faza 2, Koraci 1-6 (šema, upload, CSV/Excel parsing, PDF/LLM ekstrakcija, review queue, click tracking) — **urađeno i provereno na realnom PDF-u partner agencije**. Vidi sekciju "Faza 2" ispod. Svaki korak je na sopstvenoj feature grani (`claude/faza2-korak1-schema` itd.), još nespojene sa ovom granom.

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

## Korak 7 — role-based navigacija + Tim

### Šta radi

```
src/lib/auth/current-profile.ts      getCurrentProfile() — ulogovan user + role/agency_id iz profiles
src/lib/auth/require-role.ts         requireRole([...]) — redirect ako uloga nije dozvoljena, koristi svaka /admin/* stranica
src/app/admin/layout.tsx             Top bar (email, uloga, odjava) + nav filtriran po ulozi (samo UI, ne zaštita)
src/app/admin/agencies/              Placeholder ("Uskoro — Faza 2")
src/app/admin/offers/                Placeholder u Koraku 7, puna funkcija dodata u Faza 2 Korak 2/3/4 (vidi ispod)
src/app/admin/stats/                 Placeholder
src/app/admin/audit-log/             Placeholder u Koraku 7, prava stranica dodata u Koraku 8 (vidi ispod)
src/app/admin/team/                  Puna funkcija: lista tima, promena uloge, uklanjanje, pozivanje novog člana
prisma/migrations/20260903150000_agency_admin_team_rls/   Nova RLS policy (vidi ispod)
```

Prava po sekciji (superadmin / operator / agency_admin / agency_user):

| Sekcija | superadmin | operator | agency_admin | agency_user |
|---|---|---|---|---|
| Početna, Agencije, Ponude | ✓ | ✓ | ✓ | ✓ |
| Statistika | ✓ | ✓ | ✓ | — |
| Tim | ✓ | — | ✓ | — |
| Audit log | ✓ | ✓ | — | — |

Svaka stranica sama zove `requireRole(...)` — nav filter u layout-u je samo kozmetika (krije linkove), ne stvarna zaštita; direktan URL i dalje prolazi kroz `requireRole` + RLS.

### RLS izmena

Korak 5 je `profiles` UPDATE/DELETE ostavio isključivo superadmin-u. Nova migracija dodaje **jednu** policy: `agency_admin` sme `UPDATE` na `profiles` gde je `agency_id` = njegova agencija, **i** nova vrednost `role` mora ostati `agency_admin`/`agency_user` (ne sme promovisati sebe/kolegu na superadmin/operator) **i** `agency_id` ne sme da se promeni (ne sme prebaciti nekog u drugu agenciju). DELETE namerno nije dodat kao RLS policy — "Ukloni člana" briše `auth.users` red (cascade briše i `profiles`), što zahteva `service_role` i ručnu proveru dozvole u server akciji, ne ide kroz RLS.

Pozivanje **novog** člana (koji još nema `auth.users` red) takođe ide isključivo preko `service_role` (`inviteUserByEmail` + insert u `profiles`) uz ručnu proveru u [team/actions.ts](src/app/admin/team/actions.ts): agency_admin može da poziva samo u svoju agenciju, samo sa ulogom agency_admin/agency_user; superadmin bira bilo koju ulogu/agenciju.

### Primena i test (radiš ti, lokalno)

1. `git pull`, pa `npx prisma migrate deploy` (iz `apps/admin`).
2. Uloguj se kao superadmin — proveri da vidiš svih 6 stavki u nav-u, da `/admin/team` prikazuje sve naloge iz svih agencija, i da možeš da pozoveš novog člana birajući bilo koju ulogu/agenciju.
3. Uloguj se kao `agency_admin` — proveri da u nav-u vidiš samo Početna/Agencije/Ponude/Statistika/Tim (bez Audit log-a), da `/admin/team` prikazuje samo tvoju agenciju, da možeš da promeniš ulogu kolegi (agency_admin ↔ agency_user) i da ga ukloniš, i da invite forma nudi samo te dve uloge sa fiksnom (skrivenom) tvojom agencijom.
4. Uloguj se kao `agency_user` — proveri da NEMAŠ "Tim" u nav-u, i da direktan odlazak na `/admin/team` vraća na `/admin` (redirect iz `requireRole`).
5. Probaj i direktan URL na `/admin/audit-log` kao `agency_admin` — treba isto da te vrati na `/admin`.

## Korak 8 — Audit log

### Šta radi

```
prisma/migrations/20260908120000_audit_log/   Nova tabela audit_log + RLS (vidi ispod)
src/lib/audit/log.ts                          logAudit(...) — upis preko service_role, best-effort (greška se samo loguje, ne obara akciju)
src/app/admin/audit-log/page.tsx              Prava stranica (zamenjuje placeholder iz Koraka 7) — poslednjih 100 zapisa
```

`audit_log` namerno **nema FK** na `actor_id`/`target_id` — subjekat (profil) može kasnije biti obrisan (npr. "Ukloni člana" iz Koraka 7 briše `auth.users`, što cascade-uje `profiles`), a trag treba da ostane čitljiv i posle toga. Zato `actor_email` čuva snapshot u trenutku upisa, ne live referencu.

RLS: SELECT samo za `superadmin`/`operator` (poklapa se sa nav pravima iz Koraka 7). Namerno nema INSERT/UPDATE/DELETE policy — upis ide isključivo preko `service_role` (`lib/audit/log.ts`), koji zaobilazi RLS; bez policy-ja niko preko obične sesije ne može da piše niti menja log (nepromenljiv trag).

**Šta se trenutno loguje**: samo Tim akcije iz Koraka 7 (`profile.invite`, `profile.role_change`, `profile.remove`) — to su jedine prave mutacije koje trenutno postoje u kodu. Kad se u Fazi 2 doda CRUD za agencije/ponude, iste `logAudit(...)` pozive treba dodati i tamo.

### Primena i test (radiš ti, lokalno)

1. `git pull`, pa `npx prisma migrate deploy` (iz `apps/admin`).
2. Kao superadmin ili agency_admin, na `/admin/team`: pozovi novog člana, promeni nekome ulogu, ukloni nekoga — tri akcije, tri različita `action` tipa.
3. Otvori `/admin/audit-log` (kao superadmin) — treba da vidiš sva tri zapisa, sa ispravnim `Ko`/`Akcija`/`Detalji` (JSON diff).
4. Uloguj se kao `agency_admin` ili `agency_user` i probaj `/admin/audit-log` direktno — `agency_admin` treba da bude vraćen na `/admin` (nema pristup po nav matrici), `agency_user` isto (nema ni "Tim" ni "Audit log").

## Tech debt / otvorene odluke (za kasnije)

Stavke koje su namerno odložene tokom razgovora o Koraku 7 — ne blokiraju trenutni rad, ali ih treba rešiti pre nego što postanu relevantne:

- **`operator` uloga** — enum vrednost postoji u šemi, ali opseg prava nije definisan (verovatno read-only nadzor preko svih agencija). Nema potrebe dok postoji samo superadmin nalog; definisati kad se pojavi stvarna potreba za drugim internim korisnikom.
- **MFA enforcement za superadmin/operator** (pomenuto u Koraku 6) — obavezan MFA nije ožičen, `/auth/mfa` trenutno radi samo enrollment, ne i challenge/verify postojećeg faktora pri loginu. Treba nova stranica + middleware provera `aal` nivoa.
- **Moderacija ponuda (`offers`, Faza 2)** — nove agencije treba da prođu ručno odobravanje (superadmin) za prvih nekoliko unosa pre nego što dobiju pravo da objavljuju direktno. Predlog mehanizma: polje na `agencies` (npr. `auto_publish: bool`, default `false`) koje kontroliše da li nove ponude te agencije idu odmah u status `active` ili čekaju `pending` odobrenje; superadmin ručno prebacuje agenciju na `auto_publish = true` kad joj veruje (npr. posle X odobrenih unosa bez problema). Dizajn detalja (šta tačno "par publisheva" znači, da li je broj konfigurabilan) nije odrađen.
- **Rezervisani-ali-neplaćeni datumi (`offer_unavailable_dates`, Faza 2)** — treba `status` kolona (`pending`/`confirmed`), ne samo prost opseg datuma. Poslovna odluka da li `pending` (rezervisano, neplaćeno) blokira termin za druge kupce ili ostaje "dostupno" dok se ne potvrdi plaćanje — nije doneta.
- **Recenzije (`reviews`, van admin panela)** — dogovoreno da gost ocenjuje posle boravka (ne agencija sama sebe unosi rating). Treba sistem zaštite od lažnih recenzija (npr. dozvoliti ocenu samo gostu koji je stvarno bookirao preko sajta) — dizajn nije urađen, ostaje za kad se gradi javni review flow na `apps/site`.
- **Full snapshot rekonsilijacija za PDF upload** (Korak 4) — trenutno svaki PDF upload "puno zamenjuje" agencijine aktivne ponude, isto kao CSV/Excel (Korak 3), po doslovnom tekstu brief-a. Nije razmotreno da li ad-hoc "last minute" flajer treba da ističe ponude iz ranijih, nepovezanih upload-a te agencije — moguće da PDF treba drugačije ponašanje (dopuna, ne zamena). Otvoreno za reviziju kad se vidi stvaran obrazac upotrebe.
- **UI prikaz za `dostupno_mesta = null`** (Korak 4) — PDF cenovnici ne navode broj slobodnih mesta, polje ostaje prazno. Kako se to prikazuje na javnom sajtu (kad taj deo bude povezan) nije odlučeno.
- **Pravi background job za parsiranje** (Korak 3/4) — parsing i dalje ide sinhrono unutar upload server akcije, privremeno rešenje. Dogovoren mehanizam je Supabase Edge Function + Realtime (bez novog vendora, već u stack-u), ali nije implementiran — CSV/Excel je dovoljno brz da to nije praktičan problem, PDF/LLM ekstrakcija (10-60s) jeste, posebno na Vercel-u gde serverless funkcije imaju vremenski limit.
- **`max_gostiju` nije editabilno u review-u** (Korak 5, odluka 2026-09-15) — polje je izvedeno iz šifre sobe u `naziv` (npr. "1/4 STD" → 4 gosta), pa je slobodna izmena mogla da ga rastavi od naziva bez upozorenja. Sad je prikazano kao read-only tekst; ako se AI pogrešno pročita šifru sobe, reviewer odbija celu ponudu ("Odbij") umesto da ručno krpi broj. Otvoreno da se ponovo razmotri ako se pokaže da je ovo previše rigidno u praksi (npr. agencija ima sobu sa netipičnom šifrom koju treba ručno ispraviti bez odbijanja cele ponude).
- **`anon` privilegije na ostalim tabelama** (javni sajt, Korak 2) — `uploads`, `clicks`, `profiles` i `audit_log` još imaju podrazumevane Supabase privilegije za `anon` rolu; RLS ih blokira (anon vidi 0 redova, testirano), ali nema drugog sloja. Isti `REVOKE ALL ON <tabela> FROM anon` kao za `agencies` i `offers` bi dodao odbranu u dubinu. Nije rađeno jer nije bilo u dogovoru — jedna migracija kad se odluči (proveriti i `storage.objects`).
- **"Sponzorisano" na javnom sajtu** (javni sajt, Korak 3, odluka 2026-09-20) — trenutno je redosled samo "najjeftinije prvo". Kad agencije budu plaćale za istaknute ponude (premium/"Istaknuto", `docs/BRIEF.md` sekcija 9, još nije građeno), one izlaze **prvo**, jasno označene kao "Sponzorisano", a ostale ostaju po ceni. Treba odlučiti: model (pretplata ili po kliku, period važenja, gde se čuva — kolona na `offers` ili posebna tabela), kako se meša sa paginacijom, i kako utiče na `clicks` naplatu. Oznaka mora biti jasno vidljiva (reklama ne sme da izgleda kao organski rezultat).
- **Tip prevoza nije zasebna kolona** (javni sajt, Korak 3) — `cena_tip` razdvaja cenu po osobi od cene za jedinicu (rešeno), ali u ovom cenovniku ta razlika se poklapa sa još jednom: autobuski prevoz UKLJUČUJE prevoz + smeštaj, sopstveni prevoz je samo smeštaj (najam). Tip prevoza je i dalje samo u tekstu `naziv`; UI ne može da filtrira po njemu, a cena po osobi za jedinicu (`cena_eur` / `max_gostiju`) pretpostavlja puno popunjenje. Kad se pojavi izvor gde se to ne poklapa (npr. cena po osobi bez prevoza), treba kolona `prevoz`.
- **Pretraga sajta ne razume dijakritike** (javni sajt, Korak 3) — "sid" ne nalazi "Šid", "cacak" ne nalazi "Čačak". Rešenje: `unaccent` (ili normalizovana kolona) za `destinacija` i `naziv`. (Pretraga po `naziv` apartmana je dodata naknadno, vidi `docs/PLAN-JAVNI-SAJT.md`.)
- **Broj nesigurnih ponuda iz AI ekstrakcije jako varira između pokretanja** (Korak 4) — na istom PDF-u od 156 ponuda bilo je 44, 68 i 118 sigurnih u tri merenja (različita uputstva, ali i sam model nije deterministički). Zato je veličina review queue-a nepredvidiva. Razmotriti determinističnije podešavanje ekstrakcije (ako model dozvoljava) i dvoprolaznu proveru samo nesigurnih redova pre nego što završe u review-u.
- **Trigram indeks za pretragu** (javni sajt, Korak 3) — `ILIKE '%tekst%'` na `destinacija` ne koristi postojeći B-tree indeks; za sada je nebitno (stotine ponuda), ali kad ponuda bude više desetina hiljada treba `pg_trgm` + GIN indeks. Isto važi za `count: 'exact'` na velikoj tabeli.
- **Zaštita javne pretrage od zloupotrebe** (javni sajt, Korak 3) — svaki (debounce-ovan) unos je Server Component render + upit ka bazi, pa bot može jeftino da opterećuje bazu. Treba rate limiting (Vercel/edge) i/ili keširanje rezultata (`revalidate`) pre javnog pokretanja.
- **Prošle ponude ostaju `published`** (javni sajt, Korak 3) — pretraga ne prikazuje ponude čiji je polazak prošao, ali ništa ih ne prebacuje u `expired`; u adminu i brojaču "objavljeno" i dalje stoje (u dev bazi su svih 69 iz avgusta 2026 već prošle). Treba job koji ih isteže, ili pravilo pri upload-u.
- **Definicija "preklapanja" datuma** (javni sajt, Korak 3) — implementirano je opšte preklapanje (ponuda se prikazuje ako se bilo koji njen dan poklapa sa traženim periodom). Za fiksne turnuse (npr. 10 noćenja) to je verovatno dobro, ali za apartmane sa fleksibilnim terminom možda treba "period ponude pokriva ceo traženi boravak". Proveriti na stvarnim korisnicima; promena je jedan uslov u `searchOffers`.
- **Uzrast dece kao podfilter** (javni sajt, `GuestsField`) — filter za goste je za sad samo jedan ukupan broj (vidi tech debt napomenu o "2 odrasle · 1 dete" iznad); ne postoji podela na odrasle/decu niti uzrast deteta. Verovatno će zatrebati kad se pojavi poslovno pravilo vezano za uzrast (npr. deca mlađa od 2 godine ne plaćaju smeštaj) — to nosi i UI podfilter (uzrast po detetu) i, verovatno, izmenu šeme (`offers` trenutno nema kolonu za cenu/kapacitet po uzrasnoj grupi, samo `max_gostiju`). Nije dizajnirano, otvoreno za kad se poslovno pravilo definiše.

## Faza 2 — Unos i obrada ponuda

Pregled na običnom jeziku (bez tehničkih detalja): `docs/SAZETAK-KORAKA.md`. Sekcije ispod pretpostavljaju da je Faza 1 gotova.

### Korak 1 — Šema (`uploads`, `offers`, `clicks`)

Nove tabele po brief sekciji 5, sa enum-ima čije tačne vrednosti brief nije precizirao (odluka doneta tokom rada): `upload_type` (excel/csv/pdf), `upload_status` (pending/processing/completed/failed), `offer_status` (pending_review/published/rejected/expired).

RLS po brief sekciji 6: agency_admin/agency_user vide i insertuju `uploads` samo za svoju agenciju; `offers` čitaju samo svoje (superadmin/operator sve), UPDATE (review queue) je superadmin/operator, ne agencija direktno — agencija menja kroz re-upload (pun snapshot), ne editom reda. `agency_user` nema NIKAKAV pristup `clicks` (brief: "bez pristupa fakturisanju"), `agency_admin` vidi svoje. Nema INSERT policy na `offers`/`clicks` ni za jednu ulogu — upisuje ih isključivo `service_role` (parsing pipeline, click-out endpoint).

FK odluke: `uploads.uploaded_by` je `SetNull` (ne `Restrict`) da "Ukloni člana" iz Koraka 7 ne pukne kad obrisan član ima upload istoriju; `clicks.offer_id` je `Restrict` (ne `Cascade`) da brisanje ponude ne odnese CPC naplatnu istoriju sa sobom.

**Šema izmena u Koraku 4** (otkriveno na realnom PDF-u, vidi ispod): `offers.dostupno_mesta` je nullable, unique constraint proširen sa `naziv` (`agency_id, naziv, destinacija, datum_polaska`) jer ista destinacija+datum sad može imati više ponuda (različiti tipovi soba iz PDF cenovnika), `agencies.website` dodat kao fallback za `kontakt_url`.

### Korak 2 — Upload intake

Supabase Storage bucket `agency-uploads` (privatan, 10MB limit, CSV/Excel/PDF mime whitelist) + Storage RLS na `storage.objects`: putanja mora počinjati sa `agency_id` (`{agencyId}/{uuid}-{filename}`), agency_admin/agency_user upload-uju i čitaju samo svoj folder.

`/admin/offers` ima upload formu (agency_admin/agency_user) + tabelu istorije upload-a i ponuda (svi vide, RLS filtrira po agenciji). Upload ide preko korisnikove sopstvene RLS-scoped sesije, ne `service_role`.

### Korak 3 — CSV/Excel parsing

Fuzzy column-mapping (normalizacija + rečnik sinonima, ne pravi Levenshtein) preko `papaparse` (CSV) i `exceljs` (Excel — `xlsx` paket odbačen zbog nezakrpljenih high-severity CVE-ova, prototype pollution + ReDoS). `agencija_id` i `poslednje_azurirano` iz brief-ovog template-a se namerno ne mapiraju.

Red koji ne uspe da parsira sva obavezna polja se ne ubacuje u `offers` (broji se kao skipped) — vidi tech debt iznad.

Opciona kolona `cena_tip` (sinonimi: `tip_cene`, `vrsta_cene`, `price_type`; vrednosti "po osobi" / "za jedinicu" i slobodan tekst poput "cena za smeštajnu jedinicu"): prazno ili bez kolone = cena po osobi (brief template ima `cena_po_osobi_eur`); nejasna vrednost = red se preskače, jer se CSV/Excel objavljuje bez review-a pa se tip cene ne sme pogađati. Pravilo prepoznavanja je u `src/lib/offers/cena-tip.ts` (deli ga i AI ekstrakcija).

Rekonsilijacija "punog snapshot-a": svaki uspešno parsiran red se upsert-uje, a ponude te agencije koje su bile aktivne iz prethodnog upload-a ali nisu u ovom prelaze u `expired`.

**Bug otkriven i popravljen**: `uploads.updated_at`/`offers.updated_at` nisu imali DB-level default ni trigger — Prisma-ov `@updatedAt` radi samo kad Prisma Client sam piše, a runtime uvek piše preko Supabase klijenta. Dodat Postgres trigger + `DEFAULT` u posebnoj migraciji.

### Korak 4 — PDF/LLM ekstrakcija

Realan PDF cenovnik partner agencije se pokazao mnogo složeniji od flat CSV template-a: cenovna matrica (destinacija × vila × tip sobe × tip prevoza), ne lista pojedinačnih ponuda — jedan PDF proizvodi desetine ponuda (jedna po kombinaciji), ne jednu po redu.

- **OCR nije implementiran** — prvi partner šalje tekstualne PDF-ove (tekst se selektuje mišem), ne skenove, pa `pdf-parse` direktno vadi tekst. Ako se pojavi partner sa skeniranim PDF-om, ovaj deo pravi grešku ("PDF nema tekstualni sloj") umesto da tiho ne uradi ništa.
- **Ekstrakcija**: `lib/offers/pdf-extract.ts`, Claude API (`claude-opus-5`, streaming, `max_tokens: 64000` — veliki dokumenti lako prerastu par hiljada tokena izlaza). Model vraća JSON niz ponuda, uz `uncertain: true` na redovima gde je nesiguran (nejasna ćelija, dvosmislen kod sobe...).
- **Confidence/status**: `uncertain: false` → `published`, `confidence_score: 0.9`; `uncertain: true` → `pending_review`, `confidence_score: 0.5`. Ovo je mesto gde brief-ov princip "sve što ne prođe prag pouzdanosti ide u review queue" stvarno ima efekta (za razliku od Koraka 3, gde CSV/Excel parsing nema prave "nesigurnosti").
- **`dostupno_mesta`**: uvek `null` za PDF-izvučene ponude — izvor ne navodi broj slobodnih mesta.
- **`kontakt_url`**: `agencies.website` (fallback `agencies.kontakt`) kao privremena vrednost — PDF cenovnici nemaju link po ponudi, samo opšti kontakt agencije. Agencija naknadno sama ispravlja na link ka konkretnom apartmanu preko editabilnog polja na `/admin/offers` ("Link ka apartmanu" kolona) — vidi napomenu ispod o proširenju RLS/trigera iz pauziranja ponude.
- **`cena_tip`**: model za svaku ponudu vraća `po_osobi` ili `po_jedinici` (iz naslova tabele: "CENA PO OSOBI" vs "NAJAM / cena za smeštajnu jedinicu"); nejasno = `null` = ponuda ide u review. Na pravom PDF-u 156/156 tačno (78 autobuskih `po_osobi`, 78 sopstvenih `po_jedinici`). Validacija odgovora je čista funkcija `normalizeExtractedOffers` (testirana).
- **Model**: `claude-opus-5` (ne `claude-sonnet-5`) — projektni default za kvalitet ekstrakcije osetljive na tačnost cena.

Testirano na tekstu realnog PDF-a partner agencije (Aqua Travel, last-minute cenovnik za Grčku) — 42 ponude tačno izvučene iz isečka dokumenta, uključujući tačno izvedeni `max_gostiju` iz kodova soba (1/2, 1/3, ¼...) i realnu detekciju nesigurnih redova.

### Korak 5 — Review queue

`/admin/review` (superadmin/operator) — lista svih `pending_review` ponuda preko svih agencija, sa inline editom polja pre odobravanja (operator "uređuje ponude svih agencija"), Sačuvaj/Odobri/Odbij akcije. UPDATE ide preko korisnikove sopstvene RLS-scoped sesije, ne `service_role`.

### Korak 6 — Click tracking

Javna (bez auth) ruta `/go/[offerId]` — brief sekcija 9: "clicks tabela beleži svaki klik". Zapisuje preko `service_role` (anoniman posetilac nema sesiju), 302 redirect na `offer.kontakt_url`. `is_valid = false` za user-agent koji liči na bot/skriptu (regex) ILI ponovljen klik sa iste IP adrese na istu ponudu u poslednjih 30 min.

**Nije ožičeno na `apps/site`** — taj sajt čita mock podatke, ne pravu `offers` tabelu; brief eksplicitno isključuje javni sajt iz scope-a (sekcija 1). Testirano direktno preko URL-a.

### Dodatna unapređenja (posle testiranja na realnim podacima, van originalnog plana)

Realan PDF partner agencije (150+ ponuda iz jednog upload-a) je otkrio nekoliko nedostataka koji nisu bili vidljivi na veštačkim test podacima:

- **Paginacija + filteri** na `/admin/offers` i `/admin/review` — tabele su tiho sekle prikaz na prvih 50 redova (default limit/PostgREST row limit), preko 100 ponuda je bilo nevidljivo u UI-ju. Dodata `?page=N` paginacija, i filteri (pretraga po nazivu/destinaciji/agenciji, status) preko deljenih `components/Pagination.tsx` i `components/FilterBar.tsx`.
- **Pauziranje/reaktiviranje objavljene ponude + kapacitet** — agencija sama upravlja `status` (published ↔ paused) i `dostupno_mesta` svoje ponude, bez čekanja na tim. Granica je na nivou baze (`offers_update_agency_own` RLS policy + `offers_agency_edit_scope` trigger), ne samo UI — trigger ograničava agenciju na te dve kolone plus (naknadno) `kontakt_url`, superadmin/operator nisu ograničeni.
- **`kontakt_url` editabilan po ponudi** (`/admin/offers`, kolona "Link ka apartmanu") — PDF ekstrakcija postavlja isti opšti link agencije na svaku ponudu iz tog PDF-a (cenovnici nemaju link po apartmanu); agencija ručno ispravlja na konkretan apartman. Isto RLS/trigger pravilo kao pauza/kapacitet, dozvoljeno bez obzira na status ponude (agencija može da doda link i pre nego što je ponuda objavljena).
- **Agencija sama unosi/menja svoj naziv/kontakt/website** (`/admin/agencies`) — do sad ovo nije imalo nikakvu UI putanju sem ručnog upisa u bazu; stranica je bila čist "coming soon" plejsholder za sve uloge. Isti RLS+trigger obrazac (`agencies_update_agency_admin` + `agencies_self_edit_scope`), samo `agency_admin` (ne `agency_user`).
- **Bug fix**: review tabela je prikazivala prazno polje agencije iako je podatak postojao — Supabase embedded resurs za many-to-one FK vraća objekat (`{ naziv: "..." }`), kod je pristupao kao nizu (`.agencies?.[0]?.naziv`).
- **`max_gostiju` više nije editabilno u review-u** — izvedeno je iz šifre sobe u `naziv` (npr. "1/4 STD" = 4 gosta), slobodna izmena je mogla da ga rastavi od naziva bez upozorenja. Prikazuje se kao read-only tekst; ako AI pogrešno pročita šifru sobe, reviewer koristi "Odbij" umesto ručnog krpljenja izvedenog broja.

## Testovi

```bash
npm run test:admin      # iz korena (ili npm test u apps/admin)
```

Vitest, samo čisti unit testovi (bez baze): `cena-tip`, normalizacija AI odgovora, CSV parsiranje. Provere prema bazi (RLS, triggeri, grantovi) se rade posebnim skriptama protiv dev baze u rollback transakcijama, kao i do sad.

## Sledeći koraci (Faza 1)

- [x] Korak 1: repo i projekat (skelet, provereno)
- [x] Korak 2: Supabase projekat + konekcija (dev projekat, konekcija provereno)
- [x] Korak 3: `agencies` i `profiles` tabele u Prisma šemi + migracija (primenjeno na dev bazu, potvrđeno)
- [x] Korak 4: Auth (email/password + Google, invite-only) — testirano end-to-end
- [x] Korak 5: RLS politike — primenjeno, testirano sa dva `agency_admin` naloga (vidi gore)
- [x] Korak 6: middleware za `/admin/*` — testirano (vidi gore); MFA enforcement ostaje otvoreno
- [x] Korak 7: role-based navigacija + Tim — testirano sa sve tri role (vidi gore)
- [x] Korak 8: audit log — testirano end-to-end (vidi gore)

## Sledeći koraci (Faza 2)

- [x] Korak 1: šema (`uploads`/`offers`/`clicks` + RLS)
- [x] Korak 2: upload intake (Storage bucket + forma)
- [x] Korak 3: CSV/Excel parsing + pun snapshot rekonsilijacija
- [x] Korak 4: PDF/LLM ekstrakcija (Claude API) — testirano na realnom PDF-u partner agencije
- [x] Korak 5: review queue
- [x] Korak 6: click tracking (click-out endpoint, nije ožičeno na `apps/site`)

## Javni sajt — uvezivanje `apps/site` sa bazom (van Faze 2, u toku)

Pun plan: `docs/PLAN-JAVNI-SAJT.md`. Jedina izmena na `apps/admin` strani u celom tom planu je RLS politika ispod — ostatak (Next.js skelet za `apps/site`, data sloj, UI, klik-tracking) se dešava u `apps/site`, ne ovde.

- [x] **Korak 1 — RLS politika za javno čitanje.** Migracija `20260920100000_public_offers_select`: nova `offers_select_public` policy, `FOR SELECT TO anon USING (status = 'published')`. Testirano direktno na dev bazi (simulacija `anon` role bez JWT-a) — anon vidi SAMO `published` ponude, nema pristup `uploads`/`clicks`, postojeće politike za staff/agencije nepromenjene. Sama politika je red-level; kolone su ograničene naknadnim grantom (vidi ispod).
  - **Column-level grant na `offers`** (nalaz iz Koraka 2): migracija `20260920120000_public_offers_column_grant` — `anon` čita samo 13 kolona (`id`, `agency_id`, `naziv`, `destinacija`, `datum_polaska`, `datum_povratka`, `cena_eur`, `max_gostiju`, `dostupno_mesta`, `status`, `updated_at`, i naknadno `cena_tip`, `cena_po_osobi` — migracija `20260921100000_offer_cena_tip`, vidi `docs/PLAN-JAVNI-SAJT.md` Korak 3). `upload_id`, `confidence_score`, `published_at`, `created_at` i `kontakt_url` daju `permission denied` (i za `select *`, filter i sortiranje), čak i direktnim PostgREST pozivom. `kontakt_url` je skriven da se `/go/` brojač klikova ne može zaobići; `/go/` ga čita preko `service_role`. Nova kolona na `offers` nije javna dok se ne doda u grant novom migracijom.
- [x] **Korak 2 — Next.js skelet za `apps/site`** (izmene su u `apps/site`, ne ovde; vidi `apps/site/README.md`).
  - **Javno ime agencije** (nalaz iz Koraka 2): migracija `20260920110000_public_agencies_select` — `anon` čita samo `agencies.id`/`naziv` (column-level `GRANT`), i to samo agencije koje imaju bar jednu `published` ponudu (`agencies_select_public` policy). Ostala polja (`pib`, `cpc_cena`...) daju `permission denied` i direktnim PostgREST pozivom. Testirano SQL simulacijom i pravim API-jem.
