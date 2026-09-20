-- Plan javnog sajta (docs/PLAN-JAVNI-SAJT.md), nalaz iz Koraka 2: kartica
-- ponude na sajtu mora da prikaže izvor (naziv agencije), a anon rola do
-- sad nije videla nijedan red iz agencies. agencies ima i osetljiva polja
-- (pib, cpc_cena, mesecni_budzet_klikova, kontakt, status), pa se pristup
-- daje u dva sloja:
--
-- 1) Column-level privilegija: anon sme da čita SAMO id i naziv. Ovo
--    presuđuje čak i kad neko direktnim PostgREST pozivom (anon ključ je
--    javan po dizajnu) pokuša pib/cpc_cena ili select=* — baza vraća
--    "permission denied", ne zavisi od discipline u kodu sajta.
-- 2) Red-level RLS: agencija je javno vidljiva samo ako ima bar jednu
--    objavljenu ponudu. Tako svaka ponuda koju sajt vidi uvek ima vidljiv
--    izvor, a agencije bez objavljenih ponuda (pending/suspended/prazne)
--    ostaju nevidljive.
--
-- authenticated/service_role privilegije i postojeće politike (agencies_select
-- za staff/agencije) ostaju netaknute — REVOKE se odnosi samo na anon.
--
-- ZAVISNOST: RLS izraz ispod čita offers.agency_id i offers.status kao anon.
-- Ako se kasnije column-level ograniči i SELECT na offers za anon, te dve
-- kolone MORAJU ostati u grant listi, inače ova politika puca.

REVOKE ALL ON "agencies" FROM anon;
GRANT SELECT (id, naziv) ON "agencies" TO anon;

CREATE POLICY "agencies_select_public" ON "agencies"
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM "offers" o
      WHERE o.agency_id = "agencies".id
        AND o.status = 'published'
    )
  );
