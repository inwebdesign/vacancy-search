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

### Korak 1 — RLS politika za javno čitanje (gotovo)

Migracija `20260920100000_public_offers_select` u `apps/admin/prisma/migrations`: `offers_select_public` policy, `FOR SELECT TO anon USING (status = 'published')`. Primenjena na dev bazu.

Testirano direktno na dev bazi (simulacija `anon` role bez JWT-a, u transakciji, čisto SELECT upiti pa nema šta da se vraća nazad):
- `anon` čita `offers` → vidi SAMO `published` (69/69, tačno se poklapa sa stvarnim brojem u bazi u trenutku testa), ni `pending_review` ni `paused` ni `expired` nisu vidljivi.
- `anon` pokušava `uploads`/`clicks` → 0 redova (nema politike za te tabele, ispravno blokirano).
- Sanity: `agency_user` i `superadmin` i dalje vide isto što i pre (postojeće politike netaknute — nova politika je čist dodatak, RLS politike unutar istog `FOR SELECT` se OR-uju).

**Napomena**: sama politika ograničava samo REDOVE (RLS je red-level), ne kolone — to je naknadno rešeno column-level grantom, vidi nalaz #2 u Koraku 2 (migracija `20260920120000_public_offers_column_grant`).

### Korak 2 — Next.js skelet za `apps/site` (gotovo)

**Urađeno**: stari Vite skelet uklonjen (ostaje u git istoriji), novi Next.js 15 App Router (TypeScript, Tailwind, ESLint — preslikana admin konfiguracija), server-only Supabase klijent `src/lib/supabase/public.ts` (anon ključ, bez sesije), `.env.example`, README. Port `3001` (admin je na 3000). `apps/site/node_modules` obrisan i instalirano iz root-a — sad postoji samo jedna verzija Reacta u monorepo-u (19.x), čime nestaje uzrok ranijeg "duplirane React verzije" build buga iz `apps/admin/README.md` (site je bio na React 18).

**Provereno**: `tsc`, `lint`, `npm run build` prolaze za site i (posle `npm install`) za admin; `GET /` vraća 200. Pravi end-to-end test kroz Next server + anon ključ + PostgREST (privremena debug ruta, obrisana): vidi se 69 `published` ponuda, a 0 redova iz `pending_review`/`paused`/`expired`, `uploads`, `clicks`, `agencies`, `profiles`, `audit_log` — potvrda da Korak 1 politika radi i preko pravog API puta, ne samo u SQL simulaciji.

**Dva nalaza iz testa — treba odluka pre Koraka 3:**
1. **Ime agencije na kartici nije dostupno anon roli — REŠENO (opcija a).** `agencies` nije imala javnu politiku (0 redova), pa je upit `offers` + `agencies(naziv)` vraćao `null`, a `agencies` sadrži i osetljiva polja (`cpc_cena`, `mesecni_budzet_klikova`, `pib`). Odlučeno: (a) javna politika + column-level grant, jer je na sajtu bitan samo izvor. Migracija `20260920110000_public_agencies_select`:
   - `REVOKE ALL ON agencies FROM anon; GRANT SELECT (id, naziv) ON agencies TO anon;` — column-level: `pib`/`cpc_cena`/`select=*` daju `42501 permission denied` čak i direktnim PostgREST pozivom.
   - Politika `agencies_select_public`: agencija je javno vidljiva samo ako ima bar jednu `published` ponudu (`EXISTS`). Tako svaka ponuda koju sajt vidi ima vidljiv izvor, a agencije bez objavljenih ponuda ostaju nevidljive. (Ne `status = 'active'`, da ne bi nastale objavljene ponude bez izvora.)
   - **Testirano** na dev bazi (SQL simulacija `anon` + pravi PostgREST sa anon ključem): embed `offers` + `agencies(naziv)` vraća izvor za svih 69 ponuda (0 bez izvora), Agencija B (nema objavljenih) nije vidljiva; `pib`, `cpc_cena`, `select=*`, embed `agencies(pib)`, INSERT/UPDATE/DELETE → permission denied; `agency_admin` i `superadmin` i dalje vide osetljiva polja kao pre.
   - **Zavisnost za tačku 2:** RLS izraz čita `offers.agency_id` i `offers.status` kao anon — ako se column-level ograničava `offers`, te dve kolone MORAJU ostati u grant listi.
2. **Anon ključ je javan po dizajnu — REŠENO (column-level grant).** Ključ se nalazi i u browser bundle-u admin login stranice (potvrđeno u `.next/static` login i mfa chunk-ovima), pa iko može da gađa PostgREST direktno, mimo sajta. Posle Koraka 1 to je značilo da svako može da pročita objavljene redove sa SVIM kolonama (potvrđeno pravim upitom: `confidence_score`, `upload_id`, `agency_id`). Migracija `20260920120000_public_offers_column_grant`: `REVOKE ALL ON offers FROM anon; GRANT SELECT (...) ON offers TO anon;`.
   - **Odluke (dogovoreno):** (1) `kontakt_url` je SKRIVEN — da su direktni linkovi javni, mogli bi da se masovno pokupe i zaobiđu `/go/` brojač klikova (osnova CPC naplate); `/go/` ga čita preko `service_role`. (2) Pečat "ažurirano pre X" = `updated_at` — mana: pomera ga i pauziranje/izmena linka, pa ponuda može izgledati svežije nego što su cene; precizniji podatak bi tražio novu kolonu (kasnije, ako zatreba). (3) Grant, ne view — isti obrazac kao za `agencies`.
   - **11 javnih kolona (od 16; kasnije 13 — `cena_tip` i `cena_po_osobi`, vidi Korak 3):** `id`, `naziv`, `destinacija`, `datum_polaska`, `datum_povratka`, `cena_eur`, `max_gostiju`, `dostupno_mesta`, `updated_at` (kartica i filteri) + `agency_id`, `status` (tehničke: veza ka imenu agencije, čitaju ih politike). **Skrivene:** `upload_id`, `confidence_score`, `published_at`, `created_at`, `kontakt_url`.
   - **Testirano** (SQL simulacija svih rola + pravi PostgREST sa anon ključem): 11 javnih kolona i `count` rade (69 redova), ime agencije kroz embed radi; skrivena kolona, `select *`, filter i sortiranje po skrivenoj koloni, UPDATE/DELETE → `permission denied`; `agency_user`/`superadmin`/`service_role` i dalje vide sve kolone (`/go/` upit za Vila Estia radi).
   - **Posledica za Korak 3:** upiti sajta smeju da traže SAMO tih 11 kolona (`select('*')` puca). Nova kolona na `offers` nije javna dok se ne doda u grant novom migracijom — bezbedno po defaultu.

- Brisanje starog Vite skeleta (`index.html`, `vite.config.js`, `src/main.jsx`, `src/VacancySearch.jsx`, stari `package.json`).
- Novi Next.js App Router projekat, isti alati kao admin (TypeScript, Tailwind, ESLint).
- `.env.example` sa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase server-only klijent helper (nema sesije/cookie-a kao admin — samo `anon` ključ za javne upite, po istom principu "RLS je stvarna granica").
- Root `package.json` (`dev:site`/`build:site`) se ne menja, samo šta je iza tih skripti.

**Kriterijum završetka**: `npm run dev`/`npm run build` prolaze, prazna početna stranica se učitava na `localhost` bez greške.

### Korak 3 — Data sloj (pretraga ponuda) (gotovo)

**Odluke (dogovoreno):** destinacija je **slobodan tekst koji filtrira na svako slovo** (uz debounce, vidi Korak 4); redosled je **najjeftinije prvo** (kasnije "Sponzorisano" prvo — tech debt). Naknadno dodato: **filter po nazivu apartmana** (isti apartman nude i druge agencije — npr. subagenti koji ga preuzmu od agencije-roditelja i okače na svoj sajt) i **razdvajanje cene po osobi / za jedinicu** sa filterom po tipu.

**Urađeno** (`apps/site/src/lib/`):
- `offers/params.ts` — čist kod: `parseSearchParams` (URL → provereni parametri, uklj. `naziv` i `cenaTip`; nevažeća vrednost se tiho izbacuje, ne baca grešku), `escapeLike`, `todayInBelgrade`. Destinacija: trim, sažet razmak, bez `*`, max 100 znakova; datumi `YYYY-MM-DD` (nepostojeći poput 2026-02-31 se odbacuju, zamenjen redosled se ispravlja); gosti ceo broj 1–30; strana 1–500.
- `offers/search.ts` (server-only) — `searchOffers(params)` vraća `{ offers, total, page, pageSize, totalPages }`. Filteri: destinacija i **naziv** (apartman/vila) **sadrže** tekst (ILIKE, bez razlike u veličini slova, `%`/`_` doslovno; nezavisni, AND); **`cenaTip`** (`po_osobi` / `po_jedinici`); datumi = **preklapanje** (`polazak <= do` I `povratak >= od`, sa jednim datumom važi samo ta strana); `max_gostiju >= brojGostiju`. Uvek: `status = 'published'` (i u kodu, uz RLS — odbrana u dubinu), ne prošli polazak (`polazak >= danas` u Srbiji), ne rasprodato (`dostupno_mesta` prazno ili > 0). Redosled `cena_po_osobi ASC, id ASC` (izvedena uporediva cena, vidi dole; id radi stabilne paginacije), 20 po strani. Traži samo javne kolone + ime agencije; svaki rezultat nosi `cenaEur` (kako je agencija navela), `cenaTip` i `cenaPoOsobi`.
- `debounce.ts` — `debounce(fn, ms)` sa `cancel`, `SEARCH_DEBOUNCE_MS = 300`.

**Greška nađena testom i ispravljena:** strana iza poslednje (ručno `?page=400`) je bacala grešku baze ("Requested range not satisfiable") — javni URL bi rušio stranicu. Sad vraća praznu listu uz tačan `total`.

**Testovi** (`npm run test:site`, Vitest, 56 testova): parsiranje/escape/vremenska zona/debounce (čisto, bez baze) + integracioni testovi protiv prave dev baze sa anon ključem. Pretraga je testirana **model-based**: povuku se sve ponude, pa svaki filter i njihove kombinacije moraju da vrate tačno isto što bi vratio običan JS filter nad istim podacima (ne vežu se za brojke u bazi). Plus "ugovor sa bazom": anon vidi samo `published`, skrivene kolone i `select *` daju 42501, `agencies.pib` itd. zaključano. Mutaciono provereno: pokvaren filter gostiju ili datuma → testovi padaju. (Izbacivanje `status = 'published'` iz koda testove NE obara — namerno, RLS nameće isto pravilo; taj sloj pokriva ugovorni test.) Proveren i u pravom Next runtime-u (privremena debug ruta, obrisana).

**Napomena za razvoj:** trenutni podaci u dev bazi imaju polaske u avgustu 2026, a danas je posle toga — pretraga sa pravim "danas" zato ne vraća ništa. Testovi zadaju `today` eksplicitno. Vidi i tech debt (auto-isticanje).

**Cena po osobi / za jedinicu — REŠENO** (nađeno testiranjem, odluka: razdvojiti + filter u UI-ju). `cena_eur` nije bila uporediva: PDF cenovnik ima "cenu po osobi" (autobuski prevoz, uključuje prevoz + smeštaj) i "cenu za smeštajnu jedinicu" (sopstveni prevoz/najam), a razlika je postojala samo u tekstu `naziv`. Migracija `20260921100000_offer_cena_tip`:
- **`cena_tip`** (`po_osobi` | `po_jedinici`, podrazumevano `po_osobi`) — eksplicitna kolona. Popunjava je AI ekstrakcija (uputstvo modelu određuje tip iz naslova tabele; nejasan tip → `null` → kod šalje ponudu u review, ne pogađa se) ili opciona kolona `cena_tip` u CSV/Excel-u (prazno = po osobi; nejasna vrednost → red se preskače, jer se CSV objavljuje bez review-a).
- **`cena_po_osobi`** — IZVEDENA kolona (`GENERATED ALWAYS ... STORED`): `po_osobi` → `cena_eur`; `po_jedinici` → `cena_eur / max_gostiju` (cena po osobi pri punom popunjenju jedinice). Računa je baza, pa ne može da se razjuri kad osoblje izmeni cenu. Po njoj sajt sortira. Nije modelovana u `schema.prisma` (Prisma ne podržava generisane kolone; komentar u šemi).
- **Backfill** postojećih redova po frazi "cena za smeštajnu jedinicu" u nazivu (78 ponuda → `po_jedinici`); `updated_at` trigger je privremeno isključen da backfill ne pomeri pečat "ažurirano pre X" (provereno: 0 od 158 promenjeno).
- **Agencija ne sme da menja `cena_tip`** — dodato u listu zaštićenih kolona trigera `offers_agency_edit_scope` (bez toga bi nova kolona bila slobodno editabilna kroz `offers_update_agency_own`). Provereno: `agency_user` odbijen, i dalje sme `kontakt_url`; superadmin sme, `cena_po_osobi` se preračuna.
- **Javne kolone: 11 → 13** (`cena_tip`, `cena_po_osobi` dodate u grant za `anon`).
- **Admin**: `/admin/offers` i review prikazuju tip uz cenu ("247 € po osobi" / "468 € za jedinicu (≈ 234 €/os.)"); u review-u je tip read-only (isto obrazloženje kao `max_gostiju`).
- **AI ekstrakcija proverena živo na celom pravom PDF-u** (bez upisa u bazu): 156 ponuda, sopstveni prevoz 78/78 `po_jedinici`, autobuski 78/78 `po_osobi`, 0 neslaganja. Prvo uputstvo je povećalo broj nesigurnih (112 od 156, ranije 88) jer je "nejasan tip" bio i razlog za `uncertain`; posle razdvajanja (nejasan tip = `null`, `uncertain` samo za sumnju u vrednost) je 38 od 156. Napomena: broj nesigurnih jako varira između pokretanja (44–118 sigurnih od 156), pa se pojedinačno merenje ne sme čitati kao trajna vrednost.
- **Ograničenje**: cena po osobi za jedinicu pretpostavlja puno popunjenje (jedinica / `max_gostiju`); autobuski prevoz uključuje prevoz, sopstveni ne — vidi tech debt (tip prevoza).
- **Testovi**: 56 (site) + 14 (admin, novi Vitest u `apps/admin` za `cena-tip`, normalizaciju AI odgovora i CSV parsiranje).

**Kriterijum završetka — ispunjen**: funkcija vraća tačne rezultate za realne upite protiv dev baze (npr. "par" + 2 gosta → 15 ponuda; "Paralia" 17–19.08. + 2 gosta → 7).

### Korak 4 — UI komponente (ČEKA dizajn sistem)

**Blokirano** dok dizajn sistem ne bude gotov. Kad stigne, razlaže se dalje, ali unapred su poznati zahtevi koje mora da ispuni (pravilo koje se ne menja, brief sekcija 2):
- Svaka kartica ponude MORA imati vidljiv "ažurirano pre X" pečat (freshness indicator).
- Svaka kartica MORA imati disclaimer da agencija potvrđuje konačnu cenu — platforma nije izvor istine.
- Dugme "Poseti agenciju" vodi kroz `/go/[offerId]` (Korak 5), ne direktno na `kontakt_url`.
- Cena se uvek prikazuje sa tipom ("po osobi" / "za jedinicu", uz `cenaPoOsobi` kao "≈ X € po osobi" za jedinicu), i UI ima **filter po tipu cene** (`cenaTip`) — bez toga posetilac ne zna šta poredi.
- UI ima filter po **nazivu apartmana** (`naziv`) pored destinacije — isti apartman može da se nađe kod više agencija (subagenti) i posetilac ih poredi jednu pored druge.

**Pretraga "na svako slovo" — ugovor sa Korakom 3 (performanse):** svaki upit je Server Component render + poziv baze, pa unos MORA da bude debounce-ovan. Predviđeni tok: input drži lokalno stanje (kucanje je trenutno) → `debounce(..., SEARCH_DEBOUNCE_MS = 300)` (`src/lib/debounce.ts`, već napravljen i testiran) → `router.replace('?destinacija=...')` unutar `startTransition` (ostaje prethodni rezultat dok stiže novi; poslednji upit pobeđuje) → Server Component čita `searchParams`, zove `parseSearchParams` + `searchOffers`. URL je pravo stanje pretrage (deljivo, radi "nazad"). Na promenu filtera vraćati `page` na 1. Enter u polju treba odmah da pošalje (bez čekanja). Ako `searchOffers` vrati `offers: []` uz `page > totalPages`, preusmeriti na poslednju stranu.

### Korak 5 — Klik-tracking u `apps/site`

Preseljenje `/go/[offerId]` logike iz `apps/admin` u `apps/site` (Next.js Route Handler, `service_role` klijent — identična logika kao postojeća: upis u `clicks`, bot/duplikat detekcija, 302 redirect na `kontakt_url`).

**Otvoreno**: da li stara ruta u `apps/admin` ostaje kao fallback ili se potpuno uklanja posle preseljenja — verovatno uklanja (jedan izvor istine), ali treba potvrditi pre brisanja.

**Kriterijum završetka**: identičan test kao za postojeću admin rutu — klik na objavljenu ponudu redirektuje i upisuje red u `clicks`, klik na neobjavljenu vraća 404.

### Korak 6 — Deploy

- Novi Vercel projekat za `apps/site` (Root Directory `apps/site`, Next.js preset).
- Env varijable u Vercel dashboard-u (iste vrednosti kao admin za Supabase, plus service_role).
- Domeni — ručni deo (registrar + Vercel dashboard), uputstvo korak-po-korak kad dođemo dovde (isti obrazac kao ranije uputstva za Supabase/Resend).

## Otvorena pitanja (van scope-a ovog prolaza, ne blokiraju start)

- ~~Paginacija/broj rezultata po pretrazi~~ — rešeno u Koraku 3: 20 po strani, `?page=N`.
- Tech debt iz Koraka 3 (sponzorisane ponude, pretraga bez dijakritika i po nazivu, trigram indeks, rate limiting, auto-isticanje prošlih ponuda, cena po osobi vs po jedinici) — vidi `apps/admin/README.md`, sekcija "Tech debt".
- SEO detalji (meta tagovi, sitemap, structured data po ponudi) — nije pokriveno ovim planom, dodati posle osnovne funkcionalnosti.
- Da li se ista vila kod više agencija na neki način vizuelno grupiše na rezultatima, ili se tretira kao potpuno nezavisan rezultat — trenutna pretpostavka je "potpuno nezavisan rezultat" (prirodno iz šeme, nema cross-agency unique constraint), menjati samo ako se pokaže da korisnicima smeta.
