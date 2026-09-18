# Plan — uvezivanje javnog sajta sa bazom

Ovaj dokument je van originalne numeracije Faza iz `docs/BRIEF.md` — brief eksplicitno isključuje javni sajt iz scope-a (sekcija 1: "Javni search sajt... nije predmet ovog brief-a"). Ovo je taj sledeći, novi deo posla: sajt (`apps/site`) prestaje da čita izmišljene podatke i postaje pravi metasearch nad `offers` tabelom koju `apps/admin` puni.

## Cilj

Replika Eponuda modela za turizam: korisnik na sajtu pretražuje po destinaciji/periodu/broju gostiju, vidi **više konkurentskih ponuda** (moguće od različitih agencija, ili čak ista vila kod više agencija) jednu pored druge, i odlazi kod agencije da završi rezervaciju (klik-out, bez plaćanja/rezervacije na platformi — pravilo koje se ne menja, `docs/BRIEF.md` sekcija 2).

## Arhitektonske odluke (dogovoreno, ne menjati bez novog dogovora)

- **`apps/site` se u potpunosti prepravlja sa Vite/React na Next.js App Router** — isti stack kao `apps/admin` (TypeScript, Tailwind). Razlog: (a) Server Components znače da upit ka bazi ide isključivo na serveru, browser korisnika nikad ne dodiruje Supabase ni na koji način — ni čitanje, ni pisanje; (b) SEO — server-rendered HTML je bitan za organski Google saobraćaj, čega Vite SPA nije sposoban.
- **Nema posebnog API sloja** — Next.js server *jeste* taj sloj (Server Components pozivaju Supabase direktno, na serveru).
- **Nova RLS politika**: `anon` rola sme da čita `offers` samo gde je `status = 'published'`. Postojeće politike (`superadmin`/`operator`/agencijske) ostaju netaknute. Ovo je JEDINA izmena na `apps/admin` strani u celom ovom planu.
- **`/go/[offerId]` (klik-tracking) se seli u `apps/site`** — javni saobraćaj i klik-out sad žive zajedno, admin ostaje čisto interni alat. Koristi `service_role` isto kao i sad (anoniman posetilac nema sesiju).
- **Deploy**: dva odvojena Vercel projekta iz istog repo-a (Root Directory `apps/admin` / `apps/site`), svaki svoj domen, svoje env varijable. `apps/site` dobija sopstveni `.env.local`/`.env.example` (iste Supabase vrednosti kao admin, samo duplirane za odvojeni deploy) — uključujući `SUPABASE_SERVICE_ROLE_KEY`, koji će time postojati u dva Vercel projekta; mora ostati podjednako strogo čuvan u oba (nikad u git).
- **Dizajn sistem ide PRE UI komponenti** — korisnik pravi dizajn sistem nezavisno; UI koraci u ovom planu su blokirani dok on ne bude gotov. Backend/data sloj ne zavisi od dizajna i može da se radi odmah.

## Koraci

### Korak 1 — RLS politika za javno čitanje

Nova migracija u `apps/admin/prisma/migrations`: `offers_select_public` policy, `FOR SELECT TO anon USING (status = 'published')`.

Test (isti obrazac kao za sve dosadašnje RLS izmene): simulacija anonimne (bez JWT-a/`anon` role) sesije na dev bazi — potvrditi da se vide SAMO `published` redovi, ni `pending_review` ni `paused` ni interne kolone poput `confidence_score`/`upload_id` ne smeju biti dostupne mimo onoga što app eksplicitno traži u `select()`.

**Kriterijum završetka**: anonimna sesija čita objavljene ponude, ne čita ništa drugo; postojeće role (staff/agencije) rade nepromenjeno.

### Korak 2 — Next.js skelet za `apps/site`

- Brisanje starog Vite skeleta (`index.html`, `vite.config.js`, `src/main.jsx`, `src/VacancySearch.jsx`, stari `package.json`).
- Novi Next.js App Router projekat, isti alati kao admin (TypeScript, Tailwind, ESLint).
- `.env.example` sa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase server-only klijent helper (nema sesije/cookie-a kao admin — samo `anon` ključ za javne upite, po istom principu "RLS je stvarna granica").
- Root `package.json` (`dev:site`/`build:site`) se ne menja, samo šta je iza tih skripti.

**Kriterijum završetka**: `npm run dev`/`npm run build` prolaze, prazna početna stranica se učitava na `localhost` bez greške.

### Korak 3 — Data sloj (pretraga ponuda)

Funkcija koja prima `{ destinacija, datumOd, datumDo, brojGostiju }` i vraća `offers` gde:
- `status = 'published'` (implicitno kroz RLS, ali eksplicitno i u kodu — odbrana u dubinu, ne oslanjanje samo na bazu).
- Datumi se **preklapaju** sa traženim periodom (`datum_polaska <= datumOd` AND `datum_povratka >= datumDo` — ili obrnuto zavisno od finalne definicije "preklapanja"), ne traži se tačno poklapanje.
- `max_gostiju >= brojGostiju`.

Ne zavisi od dizajna — testira se direktno (skripta ili debug ruta), isti obrazac kao dosadašnje RLS/upit provere na dev bazi.

**Otvoreno, rešiti pre/tokom ovog koraka**: slobodna tekstualna pretraga destinacije ili padajuća lista poznatih destinacija; podrazumevano sortiranje rezultata (cena? "ažurirano pre X"? relevantnost?).

**Kriterijum završetka**: funkcija vraća tačne rezultate za realne upite protiv dev baze (npr. "Paralia, avgust, 2 gosta" vraća očekivane redove iz Aqua Travel PDF-a).

### Korak 4 — UI komponente (ČEKA dizajn sistem)

**Blokirano** dok dizajn sistem ne bude gotov. Kad stigne, razlaže se dalje, ali unapred su poznati zahtevi koje mora da ispuni (pravilo koje se ne menja, brief sekcija 2):
- Svaka kartica ponude MORA imati vidljiv "ažurirano pre X" pečat (freshness indicator).
- Svaka kartica MORA imati disclaimer da agencija potvrđuje konačnu cenu — platforma nije izvor istine.
- Dugme "Poseti agenciju" vodi kroz `/go/[offerId]` (Korak 5), ne direktno na `kontakt_url`.

### Korak 5 — Klik-tracking u `apps/site`

Preseljenje `/go/[offerId]` logike iz `apps/admin` u `apps/site` (Next.js Route Handler, `service_role` klijent — identična logika kao postojeća: upis u `clicks`, bot/duplikat detekcija, 302 redirect na `kontakt_url`).

**Otvoreno**: da li stara ruta u `apps/admin` ostaje kao fallback ili se potpuno uklanja posle preseljenja — verovatno uklanja (jedan izvor istine), ali treba potvrditi pre brisanja.

**Kriterijum završetka**: identičan test kao za postojeću admin rutu — klik na objavljenu ponudu redirektuje i upisuje red u `clicks`, klik na neobjavljenu vraća 404.

### Korak 6 — Deploy

- Novi Vercel projekat za `apps/site` (Root Directory `apps/site`, Next.js preset).
- Env varijable u Vercel dashboard-u (iste vrednosti kao admin za Supabase, plus service_role).
- Domeni — ručni deo (registrar + Vercel dashboard), uputstvo korak-po-korak kad dođemo dovde (isti obrazac kao ranije uputstva za Supabase/Resend).

## Otvorena pitanja (van scope-a ovog prolaza, ne blokiraju start)

- Paginacija/broj rezultata po pretrazi na javnom sajtu (isto pitanje kao admin liste, ali za javni deo).
- SEO detalji (meta tagovi, sitemap, structured data po ponudi) — nije pokriveno ovim planom, dodati posle osnovne funkcionalnosti.
- Da li se ista vila kod više agencija na neki način vizuelno grupiše na rezultatima, ili se tretira kao potpuno nezavisan rezultat — trenutna pretpostavka je "potpuno nezavisan rezultat" (prirodno iz šeme, nema cross-agency unique constraint), menjati samo ako se pokaže da korisnicima smeta.
