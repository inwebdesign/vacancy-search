# Slobodno — Projektni brief za izgradnju admin dashboard-a

Ovaj dokument je kompletna specifikacija dogovorena kroz planiranje projekta. Cilj je da posluži kao kontekst za nastavak razvoja — pročitaj ceo dokument pre nego što nastaviš kod, jer arhitektonske odluke u sekciji "Pravila koja se ne menjaju" direktno ograničavaju kako se implementiraju kasnije faze.

## 1. Šta se gradi

Search engine (metasearch) koji agregira raspoloživost turističkih agencija u Srbiji po destinaciji/periodu/broju osoba, i prikazuje rezultate na jednom mestu — korisnik zatim odlazi kod agencije da završi rezervaciju. Referentni model na tržištu: Eponuda (cenovni agregator za tehniku), ali za turizam.

Ovaj dokument opisuje **admin/agency dashboard** deo sistema — internu aplikaciju gde agencije uploaduju ponude, tim odobrava/uređuje podatke, i gde se prati CPC potrošnja. Javni search sajt (korisnički deo) je poseban frontend koji čita iz istog izvora podataka, ali nije predmet ovog brief-a.

## 2. Pravila koja se ne menjaju (arhitektonski temelj)

Ova pravila su rezultat analize pravnog rizika i moraju ostati netaknuta kroz sve faze:

- **Platforma nikad ne postaje strana u transakciji.** Nema plaćanja, nema izdavanja vaučera, nema rezervacije na platformi. Svaki rezultat vodi korisnika na agencijin sajt/kontakt (click-out). Ovo je razlog zašto platforma NE zahteva licencu turističke agencije po Zakonu o turizmu, niti garanciju putovanja.
- **Platforma nije izvor istine za cenu/dostupnost.** Agencija je uvek izvor istine. Svaki prikazani podatak nosi vidljiv "ažurirano pre X" pečat (freshness indicator) i disclaimer da agencija potvrđuje konačnu cenu.
- **Prihodni model je CPC (cost-per-click) prvo**, ne provizija od rezervacije. Kasnije se dodaje premium/"Istaknuto" pretplata kao drugi izvor prihoda. Provizija od prodaje se namerno izbegava — menja pravni status platforme.
- **RLS (Row Level Security) na nivou baze, ne samo u UI-ju.** Agencija ne sme da vidi podatke druge agencije čak ni direktnim API pozivom koji zaobiđe frontend.
- **Audit log od prvog dana**, na svaku mutaciju podataka. Bez izuzetka.

## 3. Tehnički stack (odlučeno)

- **Frontend/backend**: Next.js (App Router), TypeScript
- **Baza**: PostgreSQL preko Supabase (Auth + DB + Storage u jednom)
- **ORM**: Prisma (migracije se prate kroz repo, ne ručno u Supabase UI-ju)
- **Hosting**: Vercel
- **Stilizacija**: Tailwind CSS
- **Validacija**: Zod na svim server-side mutacijama
- **PDF/Excel parsing**: zaseban modul/servis (vidi sekciju 6), LLM ekstrakcija (Claude API) za nestrukturisan tekst

## 4. Faze izgradnje — pregled

| Faza | Sadržaj | Status |
|---|---|---|
| Faza 0 | Pravna priprema (van koda) | Gotovo |
| **Faza 1** | Infrastruktura: auth, role, prazan dashboard skelet | **Gotovo — vidi sekciju 7** |
| **Faza 2** | Review queue, upload flow, prve ponude u bazi | **Gotovo — vidi sekciju 8** |
| **Faza 3** | PDF/Excel parsing pipeline sa LLM ekstrakcijom, CPC tracking | **Gotovo — urađeno zajedno sa Fazom 2, vidi sekciju 8** |
| Faza 4 | Proširenje unutar Srbije, premium sloj, data insights | Sledeća na redu — nije počela |
| Faza 5 | Regionalna ekspanzija | Nije počela |

**Napomena o brojanju faza**: originalni plan je razdvajao Fazu 2 (review queue/upload flow) od Faze 3 (PDF/LLM parsing + CPC tracking) kao dva odvojena koraka. U praksi su urađene zajedno, pod jednim radnim nazivom "Faza 2" (Koraci 1-6) — CSV/Excel parsing, PDF/LLM ekstrakcija i click tracking (CPC osnova) su implementirani u istoj seriji feature grana i spojeni u `main` odjednom. Ostatak dokumenta i dalje koristi originalnu numeraciju (Faza 2 vs Faza 3) radi konzistentnosti sa ostatkom brief-a, ali status oba reda je identičan.

## 5. Šema baze (ciljna, kompletna — gradi se postepeno)

```
agencies
  id, naziv, pib, kontakt, cpc_cena, mesecni_budzet_klikova, status
  -- website dodat naknadno (Faza 2, Korak 4) — fallback za offers.kontakt_url kad
  --   izvor (PDF cenovnik) nema link po ponudi, samo opšti kontakt agencije

profiles
  id (ref auth.users), agency_id, role, created_at

uploads
  id, agency_id, originalni_fajl_url, tip, status, uploaded_by, created_at
  -- original fajl se čuva nepromenjen u Supabase Storage, nikad se ne briše

offers
  id, agency_id, upload_id, naziv, destinacija,
  datum_polaska, datum_povratka, cena_eur, max_gostiju,
  dostupno_mesta, kontakt_url, confidence_score, status,
  published_at, updated_at
  -- unique constraint: (agency_id, naziv, destinacija, datum_polaska) — "naziv" dodat
  --   naknadno (Faza 2, Korak 4): ista destinacija+datum polaska može imati više
  --   ponuda iz istog PDF cenovnika (različiti tipovi soba/vila), naziv ih razlikuje
  -- dostupno_mesta je nullable — PDF cenovnici obično ne navode broj slobodnih mesta
  -- cena_tip enum: po_osobi | po_jedinici (default po_osobi) — dodato naknadno: PDF cenovnik
  --   ima cenu po osobi i cenu za celu smeštajnu jedinicu, koje nisu uporedive
  -- cena_po_osobi: IZVEDENA (GENERATED STORED) — po_jedinici: cena_eur / max_gostiju, inače
  --   cena_eur; po njoj se sortira/poredi na javnom sajtu
  -- status enum: pending_review, published, paused, rejected, expired
  --   "paused" dodat naknadno, van originalnog plana — agencija privremeno skida
  --   svoju objavljenu ponudu sa sajta bez gubljenja podataka (npr. popunjen kapacitet)

clicks
  id, offer_id, agency_id, ip_hash, user_agent, created_at, is_valid
  -- osnova za CPC fakturisanje, is_valid filtrira botove/duple klikove

audit_log
  id, actor_id, actor_email, action, target_table, target_id, diff, created_at
  -- actor_id/target_id namerno bez FK — log mora da preživi brisanje subjekta
  -- (npr. uklanjanje člana tima); actor_email je snapshot u trenutku upisa;
  -- diff je JSONB sa pre/posle vrednostima u jednom polju (ne dve kolone)
```

Indeksi: `(destinacija, datum_polaska, dostupno_mesta)` na `offers` — glavni search upit.

**Napomena o redosledu**: Faza 1 uvodi SAMO `agencies` i `profiles`. Ostale tabele (`uploads`, `offers`, `clicks`) dolaze u Fazi 2-3 kad postoji šta da se uploaduje — ne pravi ih unapred prazne.

## 6. Role i prava pristupa

Četiri role u `profiles.role`:

- `superadmin` — sve, uključujući upravljanje korisnicima i CPC cenama
- `operator` — review queue, potvrda parsiranih podataka, uređivanje ponuda svih agencija
- `agency_admin` — vidi/uploaduje samo za svoju agenciju, upravlja svojim korisnicima
- `agency_user` — samo upload, bez brisanja, bez pristupa fakturisanju

Prava se implementiraju kao Postgres RLS politike po tabeli (select/insert/update/delete odvojeno), testirane sa realnim tokenom svake role pre puštanja u rad. UI-level provere (sakrivanje dugmadi) su dodatna pogodnost, ne sigurnosna granica.

## 7. Faza 1 — detaljan plan (gotovo)

Cilj: siguran, radan temelj bez ijednog feature-a vidljivog agencijama.

- [x] **Korak 1 — Repo i projekat.** Next.js App Router + TypeScript skelet, Tailwind, ESLint, Prisma instaliran sa PRAZNOM šemom (samo datasource/generator, bez modela). **Urađeno — fajlovi postoje u repo-u.** Napomena: kreirano bez lokalnog `npm install`/build provere zbog mrežnog ograničenja u okruženju gde je pravljeno — **prvi zadatak je da se to proveri** (`npm install`, `npm run dev`, potvrdi da nema grešaka).
- [x] **Korak 2 — Supabase projekat i konekcija.** Kreirati Supabase projekat (dev i prod odvojeno). `.env.local` sa `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Service role ključ isključivo server-side, nikad u client bundle, nikad u git (proveriti `.gitignore`). **Urađeno.**
- [x] **Korak 3 — Osnovna šema.** Prisma migracija koja dodaje SAMO `agencies` i `profiles` tabele (šema iznad, sekcija 5). Migracija kroz Prisma CLI, ne ručno u Supabase UI-ju. **Urađeno** — `agencies.status` implementiran kao enum (`pending`/`active`/`suspended`), brief nije precizirao tačne vrednosti pa je odluka doneta tokom rada.
- [x] **Korak 4 — Auth.** Email+password i Google OAuth kroz Supabase Auth. Invite-only flow: superadmin unosi email — Supabase šalje invite/magic link — korisnik postavlja lozinku. Javni signup formular eksplicitno isključen u Supabase podešavanjima. MFA za admin naloge. Rate limiting na login (max 5 pokušaja/15min po IP+email). **Urađeno i testirano end-to-end.** Dopune: Email Templates editor nije dostupan bez Supabase Pro plana, pa invite/recovery/magic-link mejlovi idu preko Supabase **Send Email Hook** (custom endpoint + Resend) koji sam gradi link ka `/auth/callback`; ta ruta sad prihvata i `token_hash`+`type` (OTP verify), ne samo `code` (OAuth PKCE). Rate limiter je IP-only u fiksnim 5-minutnim prozorima (ne IP+email, ne proizvoljan period) — postavljen na 1 zahtev/5min (≈12/sat) kao najbliža strožija aproksimacija tražene specifikacije (5/15min = 20/sat).
- [x] **Korak 5 — RLS politike.** Napisati i testirati RLS na `profiles` i `agencies`. Test scenario: dva različita agency_admin naloga, potvrditi da jedan ne može da vidi podatke drugog ni direktnim API pozivom. **Urađeno i testirano** sa dva realna naloga u različitim agencijama, pravim access token-om preko REST API-ja (ne pretpostavljeno).
- [x] **Korak 6 — Middleware i zaštićene rute.** Next.js middleware koji proverava sesiju na svakoj `/admin/*` ruti, redirect neulogovanih na login. Test da ceo lanac (auth — sesija — role) radi. **Urađeno** — zaštićena stranica je `/admin` (ne `/admin/dashboard` kako je prvobitno planirano), ispisuje email i ulogu ulogovanog korisnika; `next` parametar vraća korisnika tačno na traženu rutu posle logina, sa zaštitom od open-redirect-a.
- [x] **Korak 7 — Layout i role-based navigacija.** Sidebar sa stavkama koje se prikazuju/skrivaju po roli, vode na placeholder stranice ("Uskoro"). **Urađeno, prošireno u odnosu na plan** — 6 sekcija (Početna, Agencije, Tim, Ponude, Statistika, Audit log), većina placeholder do Faze 2, ali "Tim" ima punu CRUD funkciju (agency_admin poziva/menja ulogu/uklanja članove svoje agencije; superadmin sve agencije) — ovim je realizovan deo iz sekcije 6 ("agency_admin... upravlja svojim korisnicima") ranije nego što je plan predviđao.
- [x] **Korak 8 — Audit log.** `audit_log` tabela + helper funkcija, pozvana iz svake buduće mutacije (prazna do prve prave upotrebe u Fazi 2). **Urađeno**, uz izmenjen oblik: helper je `logAudit({actorId, actorEmail, action, targetTable, targetId, diff})` (ne `logAction(userId, akcija, tabela, recordId)`), `diff` je JSONB umesto odvojenih `stara_vrednost`/`nova_vrednost` kolona, `actor_id`/`target_id` su namerno bez FK (log preživljava brisanje subjekta). Već aktivan od Koraka 7 (Tim akcije: invite/role_change/remove) — ranije nego što je plan predviđao ("prazna do Faze 2"), jer je Tim CRUD dodat pre nego što je Faza 2 počela.

**Kriterijum završetka Faze 1 — ispunjen**: prijava sa tri realna naloga (superadmin, dva agency_admin u različitim agencijama) testirana, svaki vidi svoj deo navigacije, RLS testirano sa realnim tokenima (ne pretpostavljeno) da sprečava unakrsni pristup, zaštićena `/admin` stranica postoji i ispisuje ulogu. Nijedan red iz Excel/PDF fajla još ne postoji u bazi — Faza 2 nije počela.

## 8. Faza 2 i Faza 3 — Data ingestion, PDF/LLM ekstrakcija, CPC tracking (gotovo)

Pun tehnički opis: `apps/admin/README.md` (sekcija "Faza 2"). Opis na običnom jeziku, bez tehničkih detalja: `docs/SAZETAK-KORAKA.md`. Ispod je samo pregled šta je urađeno u odnosu na originalni plan i gde se plan odstupio.

**Urađeno kako je planirano:**
- Agencije šalju Excel/CSV ili PDF; oba puta idu kroz isti `offers` model.
- Princip "nikad se ne vraća fajl agenciji" — poštovan za PDF/LLM putanju: sve ispod praga pouzdanosti ide u internu review queue (`/admin/review`, operator/superadmin), ne nazad agenciji.
- Excel/CSV: fuzzy column-mapping (rečnik sinonima kolona, `papaparse` + `exceljs`).
- PDF: sirovi tekst ide kroz LLM (Claude API) sa strukturiranim JSON izlazom, svako polje nosi `confidence_score`; ispod praga ide u review queue kao `pending_review`, iznad praga se objavljuje direktno kao `published`.
- Upload je pun snapshot (zamenjuje prethodni) — ponude koje nisu u novom upload-u prelaze u `expired`, ne brišu se (audit trag).
- `clicks` tabela + click-out endpoint (`/go/[offerId]`) beleže svaki klik sa filtriranjem botova/duplikata (`is_valid`) — osnova za CPC fakturisanje iz sekcije 9.

**Odstupanja od plana:**
- **OCR nije implementiran.** Ako PDF nema tekstualni sloj (skeniran dokument), sistem javlja grešku umesto tihe automatske obrade — princip "nikad se ne vraća fajl" je time delimično narušen za taj slučaj, jer trenutno nema alternative osim da neko ručno prekuca podatke.
- **"Profil agencije" caching nije implementiran.** Svaki PDF upload ide kroz pun LLM poziv — nema pamćenja mapping-a po agenciji da se izbegne ponovni trošak, kako je plan predviđao.
- **Parsiranje je i dalje sinhrono**, ne background job + realtime kako je plan predviđao. Dogovoren mehanizam (Supabase Edge Function + Realtime) nije implementiran — CSV/Excel je dovoljno brz da to nije praktičan problem, PDF/LLM ekstrakcija (10-60s) jeste, posebno na Vercel-u gde serverless funkcije imaju vremenski limit. Vidi tech debt u `apps/admin/README.md`.
- **CSV/Excel redovi koji ne prođu validaciju se tiho preskaču** (broje se kao "skipped"), ne idu u review queue kao kod PDF-a — princip "sve ispod praga ide u review" je dosledno sproveden samo za PDF/LLM putanju.
- **Excel/CSV template kolone**: `agencija_id` i `poslednje_azurirano` iz originalnog template-a se namerno ne mapiraju (agencija dolazi iz prijavljene sesije, ne iz sadržaja fajla; nema odgovarajuće kolone u bazi za "poslednje ažurirano" van `created_at`/`updated_at`).
- **Unique constraint na `offers` proširen sa `naziv`** — vidi napomenu u sekciji 5. Otkriveno tek na realnom PDF cenovniku partner agencije (pricing matrica destinacija × vila × tip sobe × tip prevoza), ne u originalnom planu.

**Dodato van plana:**
- Pauziranje/reaktiviranje već objavljene ponude — agencija sama upravlja svojim kapacitetom (`paused` status, vidi sekciju 5) bez čekanja na tim.
- Agencija sama unosi/menja naziv, kontakt i website svoje agencije (do sad ovo nije imalo nikakvu UI putanju sem ručnog upisa u bazu).
- Filteri (pretraga po nazivu/destinaciji/agenciji, status) + paginacija na `/admin/offers` i `/admin/review` — nužno pošto je jedan realan PDF cenovnik proizveo 150+ ponuda.

## 9. Prihodni model (za kasniju CPC implementaciju)

- CPC fiksna cena po agenciji na startu (nema aukcije dok nema dovoljno oglašivača po istoj destinaciji) — okvirno 0.10-0.20€ po kliku u ranoj fazi.
- Mesečni budžet-limit klikova po agenciji (sprečava nekontrolisan trošak).
- `clicks` tabela beleži svaki klik na "Poseti agenciju" dugme, sa filtriranjem botova/duplikata (`is_valid` flag) pre fakturisanja.
- Premium/"Istaknuto" pretplata kao drugi prihodni sloj (uvodi se ranije nego što je prvobitno planirano — od Faze 2, ne čekati Fazu 3, zbog sezonalnosti čistog CPC prihoda). **Nije urađeno u Fazi 2/3** — prvi kandidat za Fazu 4.

## 10. Troškovi infrastrukture (okvirno)

- Faza 1: Supabase Free tier dovoljan (0€), Vercel hobby tier (0€), jedini realan trošak je domen (~15-25€/god).
- Prelazak na Supabase Pro (25$/mesec) preporučen PRE nego što prva prava agencija počne svakodnevno da koristi sistem (Free tier nema backup, pauzira se posle 7 dana neaktivnosti — neprihvatljivo za produkciju).
- LLM API trošak (PDF ekstrakcija, Claude API) je varijabilan po pozivu — **sad stvaran trošak**, ne budući (Faza 2/3 gotova, PDF upload ide kroz LLM na svaki upload jer "profil agencije" caching nije implementiran, vidi sekciju 8).

## 11. Poznata otvorena pitanja / za odluku tokom rada

Za granularnu, tekuću listu tech debt-a iz Faze 2/3 implementacije (OCR, background job, review queue za CSV/Excel, itd.) vidi `apps/admin/README.md` — ta lista se ažurira uživo kako se gradi, ovde su samo strateška/faza-nivo pitanja koja ostaju otvorena:

- ~~Tačan format i granularnost review queue UI-ja (Faza 2)~~ — **rešeno**, izgrađeno u Fazi 2 (`/admin/review`, vidi sekciju 8).
- Da li prvi PDF-partner agencija ima konzistentan format kroz vreme ili se menja — i dalje otvoreno, viđen samo jedan PDF do sad; utiče na to koliko brzo "profil agencije" mapping (koji ni nije implementiran, vidi sekciju 8) postaje isplativ.
- Regionalna ekspanzija (Faza 5) zahteva pravnu proveru po zemlji — van scope-a trenutnog koda.
- `operator` uloga — enum vrednost postoji u šemi, opseg prava (definisan u sekciji 6 ovog brief-a) nije još ožičen u kodu; nema potrebe dok postoji samo superadmin nalog.
- MFA enforcement za superadmin/operator — enrollment radi, ali ništa trenutno ne primorava obavezan MFA pri svakom loginu; treba challenge/verify stranica + middleware provera `aal` nivoa.
- Moderacija ponuda po agenciji (Faza 2) — ovo je odvojeno od confidence-based review queue-a koji je izgrađen: nove agencije treba da prođu ručno odobravanje za prvih nekoliko unosa pre nego što dobiju auto-publish pravo, nezavisno od AI pouzdanosti pojedinačne ponude; mehanizam (npr. `agencies.auto_publish` polje) nije dizajniran do detalja, nije urađeno.
- Rezervisani-ali-neplaćeni datumi na ponudama (Faza 2) — treba `status` kolona (`pending`/`confirmed`) uz opseg datuma, ne prost opseg; poslovna odluka da li `pending` blokira termin za druge kupce nije doneta; nije urađeno.
- Recenzije — dogovoreno da gost ocenjuje posle boravka (ne agencija sama sebe), potreban sistem zaštite od lažnih recenzija (npr. samo gost koji je stvarno bookirao preko sajta); dizajn nije urađen, ostaje za kad se gradi javni review flow na `apps/site`.
- Premium/"Istaknuto" pretplata (vidi sekciju 9) — plan je bio da krene od Faze 2, nije urađeno; prvi kandidat za Fazu 4.
