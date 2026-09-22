# Skill: izrada komponenti za slobodno.rs (Next.js + TypeScript + CSS Modules + clsx)

Ovo je obavezujuće uputstvo za pisanje koda sajta **slobodno.rs** — poređivača ponuda apartmana
turističkih agencija. Vizuelna istina su tri mockupa u `Slobodno - Izabrani ekrani.dc.html`
(`1a` home, `2a` rezultati pretrage, `2b` home mobilni), a sve mere, boje i tekstovi su popisani
u `README.md` u istom folderu. Kada se kod i mockup ne poklapaju, mockup je u pravu.

---

## 1. Tehnološke odluke (ne menjati bez razgovora)

| Odluka | Izbor | Zašto |
| --- | --- | --- |
| Framework | **Next.js, App Router** | Stranice rezultata moraju biti server-renderovane i deljive preko URL-a. |
| Jezik | **TypeScript, strict** | `strict: true`, `noUncheckedIndexedAccess: true`. Bez `any`. |
| Stilizacija | **CSS Modules + `clsx`** | Nula runtime-a, radi u server komponentama, tokeni kao CSS varijable. |
| Stanje u URL-u | `searchParams` + `useRouter` | Pretraga, filteri, sortiranje i paginacija žive u URL-u, ne u React stanju. |
| Stanje u klijentu | React `useState` / `useReducer` | Nema Reduxa, nema globalnog store-a. Jedini deljeni komad je lista za poređenje (Context). |
| Podaci | Server komponente + `fetch` sa `revalidate` | Cene se osvežavaju po intervalu, ne po korisniku. |
| Testovi | Vitest + Testing Library za logiku filtera i formatere | UI se ne snapshot-uje. |

**Bez styled-components, bez Emotion-a, bez Tailwinda.** Ako neko doda CSS-in-JS biblioteku,
to je regresija — svaka stilizovana komponenta postaje klijentska.

---

## 2. Tokeni pre komponenti

Sve vrednosti idu u `src/styles/tokens.css` kao CSS varijable na `:root` i **nigde se ne pišu kao
literali u modulima**. Prvi zadatak u projektu je da se ovaj fajl napiše iz `README.md`.

```css
:root {
  /* brend */
  --c-yellow: #ffcc00;
  --c-ink: #2b2b28;
  --c-ink-on-yellow: #4a3d00;

  /* tekst */
  --c-text: #3f3f38;
  --c-text-muted: #67675e;
  --c-text-disabled: #9b9b90;
  --c-link: #1f6fb2;

  /* podloge */
  --c-bg: #ffffff;
  --c-bg-cream: #fdfaf0;
  --c-bg-table: #faf8f1;
  --c-bg-highlight: #fffbe8;

  /* linije */
  --c-line: #e7e4da;
  --c-line-soft: #eeebe2;
  --c-line-softer: #f0ece0;
  --c-field: #dcd8cc;
  --c-field-off: #cfcabd;

  /* pastelni semantički parovi */
  --c-green-bg: #dcefe3;  --c-green-line: #bfe0cd;  --c-green-ink: #1e5c3c;  --c-green-ink-2: #356b4e;
  --c-amber-bg: #f7eccc;  --c-amber-ink: #6b5510;
  --c-orange-bg: #ffe6d4; --c-orange-ink: #8a4418;
  --c-blue-bg: #d9e8f2;   --c-blue-line: #bcd6e8;   --c-blue-ink: #1c5170;
  --c-chip-bg: #f4f2ea;

  /* tipografija */
  --font-sans: "Barlow", system-ui, sans-serif;

  /* radijusi */
  --r-badge: 4px; --r-dense: 6px; --r-field: 7px; --r-card: 8px;

  /* raster */
  --gutter-desktop: 40px;
  --gutter-mobile: 16px;
  --rail-width: 268px;
  --grid-gap: 28px;
  --page-max: 1240px;

  --transition: 140ms cubic-bezier(.4, 0, .2, 1);
}
```

Pravila:
- Nova boja se ne uvodi bez dogovora. Ako ti treba ton koji ne postoji, to je znak da komponenta
  treba da koristi postojeći semantički par.
- Semantika pastela je fiksna: **zelena = ušteda / najniža cena**, **narandžasta = ograničena
  dostupnost**, **žuta-amber = broj agencija**, **plava = informacija**. Nikad dekorativno.
- `2px solid var(--c-ink)` je rezervisan za dva elementa: traku pretrage i jednu razvučenu karticu
  rezultata. Ne koristiti ga kao generički „naglašen" okvir.
- Kartice nemaju senku. Nema gradijenata. Nema blur-a.

---

## 3. Struktura foldera

```
src/
  app/
    layout.tsx                 # Barlow preko next/font, <SiteHeader/>, <SiteFooter/>
    page.tsx                   # home (mock 1a / 2b)
    pretraga/
      page.tsx                 # rezultati (mock 2a) — čita searchParams
      loading.tsx              # skeleton koji drži geometriju kartice
    uporedi/page.tsx
  components/
    ui/                        # bez domenskog znanja: Button, Badge, Chip, Checkbox,
                               # Toggle, TextField, RangeField, SortChips, Pagination
    search/                    # SearchBar, DestinationInput, DateRangeField, GuestsField
    filters/                   # FilterRail, FilterGroup, FilterSummary, ActiveFilterStrip,
                               # FilterSheet (mobilni)
    results/                   # ResultCard, AgencyPriceTable, AgencyPriceRow, ComparisonTray
    marketing/                 # Hero, OfferRow, DestinationGrid, AgencyCtaBand
    layout/                    # SiteHeader, UtilityStrip, SiteFooter, Breadcrumbs
  lib/
    format.ts                  # formatPrice, formatDateRange, formatGuests, joinMeta
    filters.ts                 # parseFilters / serializeFilters (URL <-> tip)
    api.ts                     # fetch sloj
  types/
    domain.ts                  # Unit, Offer, Agency, Facets, SearchQuery, Filters
  styles/
    tokens.css
    globals.css                # reset, `a` i `a:hover`, body tipografija
```

Jedan folder = jedna komponenta:

```
components/results/ResultCard/
  ResultCard.tsx
  ResultCard.module.css
  index.ts            // export { ResultCard } from "./ResultCard";
```

---

## 4. Kako se piše komponenta

### 4.1 Server po default-u

Komponenta je server komponenta ako nema stanje ni event handler. `"use client"` se dodaje samo
kada je neophodno, i to na **najmanju moguću** komponentu. `ResultCard` je server komponenta;
samo dugme koje razvlači tabelu cena je klijentsko.

```tsx
// components/results/ResultCard/ResultCard.tsx
import clsx from "clsx";
import type { Unit } from "@/types/domain";
import { formatPrice } from "@/lib/format";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { AmenityChip } from "@/components/ui/AmenityChip";
import { ExpandPricesButton } from "./ExpandPricesButton"; // klijentska, mala
import styles from "./ResultCard.module.css";

export interface ResultCardProps {
  unit: Unit;
  /** Razvučena kartica dobija 2px ink okvir i istaknutu kolonu sa cenom. */
  expanded?: boolean;
  inComparison?: boolean;
  className?: string;
}

export function ResultCard({ unit, expanded = false, inComparison = false, className }: ResultCardProps) {
  const cheapest = unit.offers.find((o) => o.available);

  return (
    <article className={clsx(styles.card, expanded && styles.cardExpanded, className)}>
      <PhotoPlaceholder crop="340×280" className={styles.photo} />

      <div className={styles.detail}>
        <p className={styles.eyebrow}>{unit.place}</p>
        <h3 className={styles.title}>{unit.name}</h3>
        <p className={styles.description}>{unit.description}</p>
        <ul className={styles.amenities}>
          {unit.amenities.map((a) => (
            <li key={a}><AmenityChip>{a}</AmenityChip></li>
          ))}
        </ul>
      </div>

      <div className={clsx(styles.priceCell, expanded && styles.priceCellExpanded)}>
        <p className={styles.priceLabel}>{unit.offers.length} agencija nudi · od</p>
        <p className={styles.price}>
          {cheapest ? formatPrice(cheapest.pricePerPerson) : "popunjeno"}
          <span className={styles.priceSuffix}> / osobi</span>
        </p>
        <ExpandPricesButton unitId={unit.id} expanded={expanded} offerCount={unit.offers.length} />
      </div>
    </article>
  );
}
```

### 4.2 Pravila za props

- Uvek izvezi `export interface <Ime>Props`. Nema inline anonimnih tipova.
- Uvek primi i prosledi `className` kao **poslednji** argument `clsx`-a — tako roditelj može da
  doda margin bez `!important`.
- Varijante su string unije, ne boolean gomila: `variant: "primary" | "dark" | "outline"`,
  `size: "sm" | "md"`. Izuzetak su prava stanja (`expanded`, `disabled`, `checked`).
- Boolean prop ima default `false` i čita se afirmativno (`expanded`, ne `notCollapsed`).
- Komponenta koja obavija HTML element prosleđuje ostatak atributa:
  `React.ComponentPropsWithoutRef<"button">`.
- Nema `React.FC`. Obična funkcija sa tipiziranim destrukturiranim props-ima.
- Domenski tipovi (`Unit`, `Offer`) se primaju celi; ne razlaži objekat u deset skalarnih props-a.

### 4.3 clsx — kako se koristi

```tsx
clsx(
  styles.button,                 // baza, uvek prva
  styles[variant],               // varijanta preko lookup-a
  size === "sm" && styles.sm,    // uslovi
  { [styles.disabled]: disabled },
  className                      // roditeljski override, uvek poslednji
)
```

Ne konkateniraj stringove ručno, ne gradi imena klasa šablonom (`styles[`btn-${x}`]` puca u
tipovima — koristi eksplicitnu mapu ako varijanti ima mnogo).

### 4.4 CSS Modules — konvencije

```css
/* ResultCard.module.css */
.card {
  display: grid;
  grid-template-columns: 170px 1fr 230px;
  border: 1px solid var(--c-line);
  border-radius: var(--r-card);
  background: var(--c-bg);
  overflow: hidden;           /* foto ide do ivice */
}

.cardExpanded { border: 2px solid var(--c-ink); }

.title {
  margin: 3px 0 5px;
  font: 700 20px var(--font-sans);
  color: var(--c-ink);
}

.description {
  font: 400 14px / 1.6 var(--font-sans);
  color: var(--c-text);
  text-wrap: pretty;
}

.eyebrow {
  font: 600 10px var(--font-sans);
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

@media (max-width: 1100px) {
  .card { grid-template-columns: 1fr; }   /* foto gore, tekst, pa cena */
}
```

- `camelCase` imena klasa (da se čitaju kao `styles.priceCell`).
- Selektori su **jednoslojni**. Bez ugnježdavanja i bez `.card .title` lančanja — ako ti treba
  kontekst, to je nova komponenta ili modifikator klasa.
- Bez `:global`, osim u `globals.css`.
- Nema fiksnih visina na ništa što sadrži tekst. Kartice rastu.
- Tranzicije samo na boju: `transition: background-color var(--transition), border-color var(--transition), color var(--transition);`
  Bez `transform`, bez `scale`, bez pojavljivanja na skrol.
- Stanja: `:hover` (link `--c-link` → `--c-ink`; žuto dugme potamni; outline dobije `#c8c2b2`
  okvir), `:active` samo drži hover boju, `:focus-visible` daje vidljiv `--c-ink` okvir —
  obavezno na svim poljima filtera.

---

## 5. Filter — najосetljiviji deo, ima svoja pravila

1. **Nikad slider.** Svaki opseg su dva numerička polja u koja korisnik sam upisuje, sa `od` / `do`
   labelom. Jedna komponenta pokriva sve opsege:

```tsx
export interface RangeFieldProps {
  label: string;                       // "CENA PO OSOBI (€)"
  value: { min?: number; max?: number };
  onCommit: (next: { min?: number; max?: number }) => void;
  placeholder?: string;                // "unesite"
  showApplyButton?: boolean;           // desktop: OK; mobilni: primena na blur
}
```
   Polje u koje je korisnik upisao vrednost dobija `1px solid var(--c-ink)`; prazno opciono polje
   prikazuje placeholder `unesite` u `--c-text-disabled`. Primena ide na `OK` / `Enter` / `blur`,
   nikad na svaki pritisak tastera.

2. **Svaka opcija prikazuje broj rezultata** desno (13px, `--c-text-muted`). Brojevi dolaze sa
   servera kao `facets`, ne računaju se u klijentu.

3. Filter menja **URL**, pa se rezultati, brojevi i zeleni sažetak osvežavaju iz servera:

```ts
// lib/filters.ts
export function serializeFilters(f: Filters): URLSearchParams
export function parseFilters(sp: ReadonlyURLSearchParams): Filters
```
   Klijentska komponenta poziva `router.replace(`?${serializeFilters(next)}`, { scroll: false })`.
   Nema duplog izvora istine — ne drži izabrane filtere u `useState` pored URL-a.

4. **Sažetak** (`FilterSummary`) je pastelno-zelena kutija ispod filtera i uvek govori tri stvari:
   koliko je filtera aktivno, koliko je rezultata prikazano od ukupno, i koja je najniža cena u
   izboru.

5. **Mobilni** koristi istu logiku, drugu školjku: `FilterSheet` je donja fioka koju otvara dugme
   sa žutim brojačem, sa fiksnim podnožjem „Poništi" / „Prikaži N rezultata". Grupe filtera se
   **ne duplaju** — `FilterGroup` i `RangeField` su iste komponente, samo veće mete dodira
   (checkbox 20px, polja 12px padding, dugmad ≥48px visine).

6. Redosled grupa je fiksan: cena po osobi · ukupna cena · tip jedinice · udaljenost od plaže ·
   usluga · sadržaj · prevoz · agencija.

---

## 6. Cene, tekst i formatiranje

Sve kroz `lib/format.ts` — nikad `toLocaleString` razbacan po komponentama.

```ts
formatPrice(186)                          // "186 €"        (razmak pre simbola)
formatDateRange("2026-07-12", "2026-07-22") // "12.07 — 22.07.2026."
formatGuests({ adults: 2, children: 1 })  // "2 odrasle · 1 dete"
joinMeta(["10 noćenja", "200 m do plaže", "klima"]) // spaja sa " · "
```

- Separator je **srednja tačka sa razmacima** ` · `. Ne zapeta, ne crta, ne `|`.
- Cene su u evrima, po osobi, uz obaveznu ukupnu cenu u sekundarnom redu.
- Popunjeno je `popunjeno`; ograničena dostupnost je `poslednja 2 mesta`.
- Tipovi jedinica ostaju agencijska skraćenica: `Studio 2/1`, `Apartman 2/4`.
- Ceo interfejs je **srpski, latinica, sa dijakritikom**. Nikad engleske reči u UI-ju
  („Pretraži", ne „Search"). Naslovi i dugmad su u sentence case-u; velika slova su rezervisana
  za labele polja pretrage, zaglavlja tabela i naslove grupa filtera.
- Obraćanje je na „Vi" bez zamenice („Pošaljite upit"), dugmad u imperativu („Pretraži",
  „Idi na sajt").
- Bez emodžija.

---

## 7. Izlazni klik je poslovni model

„Idi na sajt" je jedina konverzija na sajtu:

```tsx
<a
  href={offer.deepLink}
  target="_blank"
  rel="nofollow sponsored noopener"
  onClick={() => trackOfferClick({ unitId, agencyId: offer.agencyId, price: offer.pricePerPerson })}
>
  Idi na sajt
</a>
```

Zahtevi: nikad `<button>` za izlazni link (mora da se može otvoriti u novom tabu), uvek
`sponsored nofollow`, uvek događaj sa cenom koja je **korisniku bila prikazana**, i uvek vidljiv
podatak kada je cena zadnji put osvežena. Ako je cena starija od intervala osvežavanja, prikaži je
kao orijentacionu, ne tiho kao tačnu.

---

## 8. Pristupačnost i semantika

- Kartica rezultata je `<article>`, lista kartica je `<ul>` / `<li>`, tabela cena agencija je
  prava `<table>` sa `<th scope="col">` (mockup je crta grid-om radi brzine — u kodu ide tabela).
- Dugme koje razvlači cene nosi `aria-expanded` i `aria-controls`.
- Filter fioka na mobilnom je `<dialog>` ili ima `role="dialog"` + `aria-modal`, sa fokus zamkom
  i vraćanjem fokusa na dugme koje ju je otvorilo.
- Checkbox i toggle su pravi `<input>` elementi, vizualno zamenjeni, nikad `<div onClick>`.
- Kontrast: sitan tekst minimum 4.5:1. `--c-text-muted` je izračunat za belu i `--c-bg-table`
  podlogu; svetliji ton od njega se ne koristi za tekst koji nosi informaciju.
- Popunjena ponuda ostaje u DOM-u, osivljena — nikad se ne skriva.
- Fokus je vidljiv na svakom polju filtera. Provera tastaturom je deo definicije „gotovo".

---

## 9. Definicija „gotovo" za jednu komponentu

1. Server komponenta ako nije morala da bude klijentska.
2. `Props` interfejs izvezen, `className` prosleđen, varijante kao unije.
3. Nula boja i mera kao literala — sve iz `tokens.css`.
4. `clsx` redosled: baza → varijanta → stanja → `className`.
5. Odgovara mockupu u pikselima na 1240px, i ne lomi se na 390px.
6. Stanja: hover, `:focus-visible`, disabled, prazno, i dugačak tekst (naslov u dva reda,
   osam čipova sadržaja).
7. Bez fiksne visine na kontejneru sa tekstom.
8. Semantički elementi i ARIA gde ih odeljak 8 zahteva.
9. Srpski tekstovi sa dijakritikom, ` · ` kao separator, cene kroz `formatPrice`.

---

## 10. Šta nije dizajnirano — pitaj pre nego što izmisliš

Stranica pojedinačnog smeštaja, ekran „Uporedi izabrano", prazan rezultat pretrage, prijava,
korisnički nalog, panel za agencije, e-mail obaveštenja o padu cene, i stranice grešaka.
Za prazno i učitavajuće stanje predlog stoji u `README.md`, ali nije odobren dizajn.
Ne izmišljaj ikonice: mockupi koriste tekstualne labele i nekoliko Unicode glifova (`▾ ▴ ✕ → ·`).
Ako ikonice postanu potrebne, uvodi se **jedan** set namerno (Lucide, 1.5px), ne mešanje glifova.
