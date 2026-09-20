-- Plan javnog sajta (docs/PLAN-JAVNI-SAJT.md), Korak 2, nalaz #2: anon ključ
-- je javan po dizajnu (nalazi se u browser bundle-u admin login stranice),
-- pa iko može da pita PostgREST direktno, mimo sajta. Politika iz Koraka 1
-- (offers_select_public) ograničava REDOVE na published, ali ne i KOLONE —
-- anon je mogao da pročita confidence_score, upload_id i kontakt_url.
--
-- Isti obrazac kao za agencies (migracija 20260920110000): column-level
-- privilegija. Sve ostalo (izvan spiska ispod) daje "permission denied",
-- uključujući select=*, filtriranje i sortiranje po skrivenoj koloni (da se
-- vrednost ne može pogađati preko filtera).
--
-- JAVNE kolone (odluka: 11 od 16):
--   id, naziv, destinacija, datum_polaska, datum_povratka, cena_eur,
--   max_gostiju, dostupno_mesta — sadržaj kartice i filteri pretrage
--   updated_at — pečat "ažurirano pre X" (brief sekcija 2)
--   agency_id, status — tehnički: veza ka imenu agencije i pravila
--     offers_select_public / agencies_select_public ih čitaju kao anon
--
-- SKRIVENE: upload_id, confidence_score, published_at, created_at, kontakt_url.
--   kontakt_url je skriven da se direktni linkovi ne mogu masovno pokupiti
--   i tako zaobići /go/[offerId] brojač klikova (osnova CPC naplate);
--   /go/ ga čita preko service_role.
--
-- Nova kolona na offers NIJE javna dok se ne doda u GRANT ispod (nova
-- migracija) — bezbedno po defaultu.
--
-- REVOKE ALL skida i INSERT/UPDATE/DELETE koje Supabase po defaultu daje
-- anon roli (RLS ih je i do sad blokirao, ovo je dodatni sloj).
-- authenticated i service_role privilegije nisu diranje.

REVOKE ALL ON "offers" FROM anon;
GRANT SELECT (
  id,
  agency_id,
  naziv,
  destinacija,
  datum_polaska,
  datum_povratka,
  cena_eur,
  max_gostiju,
  dostupno_mesta,
  status,
  updated_at
) ON "offers" TO anon;
