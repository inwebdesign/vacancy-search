# Slobodno — Sažetak koraka (za nestručnu publiku)

Ovaj dokument objašnjava svaki korak izgradnje jednostavnim jezikom, bez tehničkih detalja — za nekoga ko nije programer, ali želi da razume šta je urađeno i zašto. Puni tehnički opis je u `apps/admin/README.md`; poslovna specifikacija je u `docs/BRIEF.md`.

Popunjava se postepeno, korak po korak, kako se implementacija odvija. Kad sve faze budu gotove, ovaj fajl je spreman za deljenje/preuzimanje kao pregled celog projekta.

## Faza 1 — Infrastruktura (gotovo)

*(sažeci za Fazu 1 nisu napisani u ovom stilu — vidi `apps/admin/README.md` za pun opis Koraka 1-8: skelet projekta, Supabase konekcija, baza, prijava korisnika, bezbednosna pravila, zaštićene stranice, meni po ulozi, i evidencija ko-je-šta-menjao.)*

## Faza 2 — Unos i obrada ponuda (gotovo, spojeno u main)

### Korak 1 — Prazne fioke u bazi

Napravljene su tri nove "fioke" u bazi, još prazne:
- **uploads** — evidencija svakog fajla koji agencija pošalje (ko, kada, koji tip fajla)
- **offers** — evidencija svake ponude (letovanje, cena, datumi, koliko mesta ima)
- **clicks** — evidencija svakog klika na "poseti agenciju" (osnova za naplatu)

Uz fioke su odmah napisana i pravila ko sme da zaviri unutra: agencija vidi samo svoju fioku, superadmin vidi sve, obični zaposleni agencije ne sme da vidi fioku sa klikovima (to je novac/naplata, osetljivo).

**Zašto je bitno**: sve što dolazi posle (upload fajla, obrada, pregled ponuda) mora nešto negde da upiše i pročita. Bez ovih fioka i pravila nema gde — ovo je temelj na kom sve ostalo stoji.

### Korak 2 — Prijemni šalter za fajlove

Agencija na stranici "Ponude" ima dugme da uploaduje svoj CSV/Excel/PDF fajl. Kad ga pošalje:
1. Originalni fajl se čuva netaknut u "trezoru" (Supabase Storage) — nikad se ne menja niti briše, čak i posle obrade.
2. U fioku uploads (Korak 1) upisuje se priznanica: ko je poslao, kada, koji tip fajla, status "na čekanju".

Svaka agencija ima svoju zaključanu policu u trezoru — ne može da vidi ni upload-uje u tuđu, čak ni direktnim trikom mimo sajta.

**Zašto je bitno**: ovo su ulazna vrata za sve podatke koje agencije šalju. Bez ovoga nema šta da se obrađuje u sledećem koraku.

### Korak 3 — Činovnik koji čita fajl i ažurira listu ponuda

Čim fajl stigne, automatski se otvara i čita:
1. Prepoznaje kolone i kad nisu identično nazvane (npr. "cena" umesto "cena_po_osobi_eur") — pametno pogađa šta je šta.
2. Svaki red (jedna ponuda) proverava da li ima sve bitne podatke. Ako nešto fali ili je nečitljivo, taj red se preskače, ne ubacuje se pogrešno.
3. Ono što prođe, upisuje se u fioku offers kao objavljena ponuda.

Poseban trik — "pun snimak": svaki novi upload zamenjuje ceo prethodni spisak te agencije. Ako neka stara ponuda nije više u novom fajlu, ne briše se nego se obeleži kao "istekla" (ostaje trag, ne nestaje tiho).

**Zašto je bitno**: ovo je "mozak" koji pretvara sirov Excel/CSV u stvarne ponude koje se prikazuju. Bez ovoga, upload-ovan fajl samo sedi u trezoru bez ikakvog efekta.

### Korak 4 — Digitalni činovnik koji čita PDF cenovnik

CSV/Excel fajlovi (Korak 3) su uredne tabele — lako ih čita program. PDF cenovnik agencije obično nije: to je slobodan tekst, često matrica (destinacija × vila × tip sobe × tip prevoza), napravljena da je čovek čita, ne kompjuter. Zato se ovde koristi veštačka inteligencija (Claude), kao digitalni činovnik koji "razume" tekst kao čovek:

1. Iz PDF-a se izvuče sav tekst.
2. Tekst se pošalje AI-ju sa uputstvom: svaka kombinacija vila + tip sobe + tip prevoza je jedna posebna ponuda, ne sme da se spaja u jedan red.
3. AI vrati spisak ponuda (naziv, destinacija, datumi, cena, broj gostiju) — i za svaku, koliko je siguran da je dobro pročitao.
4. Ponude gde je AI vrlo siguran idu odmah u promet. Manje sigurne idu u red za pregled (Korak 5) da ih čovek potvrdi pre objave.

**Zašto je bitno**: u praksi agencije najčešće šalju baš ovakve PDF cenovnike, ne uredne tabele. Bez ovog koraka, najveći deo stvarnih podataka od agencija ne bi mogao da se obradi automatski.

### Dodatno — prikaz svih ponuda i pauziranje

Kad je isprobano sa pravim cenovnikom jedne agencije, jedan PDF je doneo preko 150 ponuda (sve kombinacije sobe/prevoza/vile). To je otkrilo dva nedostatka, odmah ispravljena:

- **Stranicenje (paginacija) i pretraga**: liste ponuda i pregleda su tiho prikazivale samo prvih 50 — sad imaju dugmad "Prethodna/Sledeća" da se vidi baš sve, plus pretragu po nazivu, destinaciji, agenciji i statusu.
- **Pauziranje ponude**: agencija sad sama može da privremeno "ugasi" već objavljenu ponudu (npr. kad se popune mesta) i kasnije je ponovo "upali", kao i da promeni broj slobodnih mesta — bez čekanja na tim. Cenu, datume i ostale podatke i dalje menja samo tim, kroz kontrolnu tačku (Korak 5).
- **Link ka konkretnom apartmanu**: kad AI izvuče ponude iz PDF cenovnika, ne zna tačan link ka svakom apartmanu (cenovnik ga ne sadrži) — svaka ponuda iz istog PDF-a je prvo dobijala isti opšti link ka sajtu agencije (klik je vodio na početnu stranicu, ne na konkretan apartman). Sad agencija sama unosi ispravan link za svaku ponudu, na istom mestu gde pauzira ponude.
- **Agencija sama unosi svoje ime**: stranica "Agencije" je do sad bila prazna ("uskoro") — sad agencija tu unosi svoj naziv, kontakt i sajt, umesto da to neko ručno upisuje u bazu.

**Zašto je bitno**: pravi cenovnik od prave agencije je odmah otkrio ono što veštački test-primeri nisu — zato je testiranje sa stvarnim podacima bilo ključno, ne samo sa izmišljenim.

### Korak 5 — Kontrolna tačka pre javnosti

Neke ponude su sumnjive (npr. nešto nejasno u podacima) i ne idu direktno u promet, nego čekaju u posebnom redu — review queue. Tu superadmin ili operater:
1. Vidi sve ponude na čekanju, sa svih agencija na jednom mestu.
2. Može da ispravi podatak ako nešto nije u redu (npr. pogrešna cena).
3. Klikne Odobri (ide u promet) ili Odbij (ne ide dalje).

**Zašto je bitno**: ovo je poslednja provera pre nego što nešto postane vidljivo — sigurnosna mreža protiv loših/nepotpunih podataka koji su nekako prošli kroz Korak 3.

### Korak 6 — Brojač na izlaznim vratima

Kad neko klikne "Poseti agenciju", prolazi kroz mali kontrolni punkt pre nego što stigne na pravi sajt agencije:
1. Zabeleži se klik (koja ponuda, kad) u fioku clicks.
2. Proveri se da li je klik sumnjiv — bot/skripta, ili ista osoba kliknula na istu ponudu pre manje od pola sata (da se ne naplati dvaput).
3. Korisnik se odmah prosledi na pravi sajt agencije, bez primetnog kašnjenja.

Napomena: ovo još nije povezano sa pravim javnim sajtom (ta veza dolazi posebno, van ovog dela projekta).

**Zašto je bitno**: ovo je osnova za naplatu (plaćanje po kliku). Bez tačnog brojanja, ne može se pravično naplatiti agencijama niti sprečiti lažno naduvavanje brojki.

## Javni sajt — uvezivanje sa bazom (u toku)

Do sad je sve građeno "iza scene" — agencije šalju cenovnike, tim ih proverava. Ovaj deo pravi ono što vide obični posetioci: sajt gde se traži smeštaj i porede ponude više agencija (kao Eponuda, samo za turizam). Plan: `docs/PLAN-JAVNI-SAJT.md`.

### Korak 1 — Prozor za prolaznike

Baza je do sad bila zaključana za svakoga ko nije ulogovan. Sad je na njoj napravljen "izlog": neko ko nije ulogovan može da pogleda samo ponude koje su već objavljene — ništa drugo. Ponude koje čekaju proveru, podaci o klikovima, agencijama ili uploadima ostaju potpuno nevidljivi. Niko spolja ne može ništa da promeni ili obriše.

**Zašto je bitno**: sajt mora odnekud da čita ponude, a ovo je način da javnost vidi samo ono što sme, uz zaštitu na nivou same baze (ne samo u kodu sajta).

Dopuna Koraka 1: posetilac sada može da vidi i **ime agencije** uz ponudu ("Izvor: Agencija A"), ali samo ime — ništa drugo o agenciji (cene naplate, PIB, kontakt) nije dostupno javnosti, i to je zaključano u samoj bazi. Vidi se samo ime agencije koja ima bar jednu objavljenu ponudu.

### Korak 2 — Prazan nov sajt, spreman za građenje

Stari sajt je bio samo maketa sa izmišljenim apartmanima. Zamenjen je novim, praznim temeljom — istim alatom kao admin deo — koji je već povezan sa bazom, ali za sada prikazuje samo naslov "Slobodno". Sajt čita bazu isključivo "sa svoje strane" (server), pa posetiočev pregledač nikad ne razgovara direktno sa bazom. Izgled se pravi tek kad bude gotov dizajn.

**Zašto je bitno**: ovo je temelj na kom se grade pretraga i rezultati, i zbog izbora alata sajt će moći da se dobro pozicionira na Google-u.

### Faza 3, 4, 5 — *(dolazi)*
