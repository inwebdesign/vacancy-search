# Slobodno — Vacancy Search

Pretraga slobodnog smeštaja u Srbiji (apartmani, vile, kuće) po destinaciji, datumima i broju gostiju, sa realnom proverom dostupnosti umesto "možda". Rezultati vode direktno na sajt agencije koja poseduje smeštaj — rezervacija se ne zaključuje na ovoj stranici.

## Funkcionalnosti

- Pretraga po destinaciji sa predlozima gradova dok kucaš
- Izbor datuma dolaska/odlaska sa proverom preklapanja sa zauzetim terminima
- Izbor broja odraslih i dece, sa filtriranjem smeštaja po kapacitetu
- Pamćenje poslednje pretrage i nedavnih destinacija (lokalno, po pregledaču)
- Kartice smeštaja sa cenom po noći, ukupnom cenom, ocenom, izvorom i vremenom poslednjeg ažuriranja
- B2B forma za prijavu turističkih agencija koje žele da oglase svoje slobodne termine

## Tehnologije

- React 18 + Vite
- [lucide-react](https://lucide.dev/) za ikonice

## Pokretanje

```bash
npm install
npm run dev
```

Aplikacija se pokreće na `http://localhost:5173`.

### Build za produkciju

```bash
npm run build
npm run preview
```

## Napomena

Podaci o smeštaju u `src/VacancySearch.jsx` su statični primer (destinacije: Beograd, Novi Sad, Zlatibor, Kopaonik). Komponenta je izvorno napravljena za Claude artifact okruženje (koristi `window.storage` API) — `src/main.jsx` sadrži polyfill koji tu funkcionalnost prebacuje na `localStorage` kako bi aplikacija radila samostalno u bilo kom pregledaču.
