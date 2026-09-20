-- Cena po osobi vs cena za smeštajnu jedinicu (docs/PLAN-JAVNI-SAJT.md,
-- Korak 3, nalaz). PDF cenovnik ima obe vrste (autobuski prevoz = cena po
-- osobi, sopstveni prevoz/najam = cena za celu jedinicu), a razlika je do
-- sad postojala samo u tekstu offers.naziv — pa "najjeftinije prvo" nije
-- poredilo uporedive iznose.
--
-- 1) cena_tip: eksplicitna kolona. Podrazumevano po_osobi (brief template
--    kolona je cena_po_osobi_eur). Popunjava je AI ekstrakcija (PDF) ili
--    opciona kolona u CSV/Excel-u.
-- 2) cena_po_osobi: IZVEDENA (GENERATED STORED) kolona za sortiranje i
--    poređenje: po_osobi -> cena_eur; po_jedinici -> cena_eur / max_gostiju
--    (cena po osobi pri punom popunjenju jedinice). Računa je baza, pa ne
--    može da se razjuri sa cena_eur/cena_tip kad osoblje izmeni cenu.
--    Ne modeluje se u schema.prisma (Prisma ne podržava generisane kolone).
-- 3) Backfill: postojeće ponude sa frazom "cena za smeštajnu jedinicu" u
--    nazivu (tako ih je AI označavao) postaju po_jedinici. updated_at
--    trigger se privremeno gasi da backfill ne bi pomerio pečat "ažurirano
--    pre X" na sajtu.
-- 4) Agencija NE sme da menja cena_tip (menja poređenje cena) — dodato u
--    listu zaštićenih kolona trigera offers_agency_edit_scope; bez ovoga bi
--    nova kolona bila slobodno editabilna kroz offers_update_agency_own.
-- 5) anon sme da čita obe nove kolone (javne su kao i cena_eur).

CREATE TYPE "cena_tip" AS ENUM ('po_osobi', 'po_jedinici');

ALTER TABLE "offers" ADD COLUMN "cena_tip" "cena_tip" NOT NULL DEFAULT 'po_osobi';

ALTER TABLE "offers" DISABLE TRIGGER "set_offers_updated_at";
UPDATE "offers"
  SET "cena_tip" = 'po_jedinici'
  WHERE "naziv" ILIKE '%cena za smeštajnu jedinicu%';
ALTER TABLE "offers" ENABLE TRIGGER "set_offers_updated_at";

ALTER TABLE "offers" ADD COLUMN "cena_po_osobi" DECIMAL(10,2)
  GENERATED ALWAYS AS (
    CASE
      WHEN "cena_tip" = 'po_jedinici'
        THEN ROUND("cena_eur" / GREATEST("max_gostiju", 1), 2)
      ELSE "cena_eur"
    END
  ) STORED;

CREATE OR REPLACE FUNCTION public.enforce_offer_agency_edit_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.current_profile_role() NOT IN ('agency_admin', 'agency_user') THEN
    RETURN NEW;
  END IF;

  IF NEW.agency_id IS DISTINCT FROM OLD.agency_id
    OR NEW.upload_id IS DISTINCT FROM OLD.upload_id
    OR NEW.naziv IS DISTINCT FROM OLD.naziv
    OR NEW.destinacija IS DISTINCT FROM OLD.destinacija
    OR NEW.datum_polaska IS DISTINCT FROM OLD.datum_polaska
    OR NEW.datum_povratka IS DISTINCT FROM OLD.datum_povratka
    OR NEW.cena_eur IS DISTINCT FROM OLD.cena_eur
    OR NEW.cena_tip IS DISTINCT FROM OLD.cena_tip
    OR NEW.max_gostiju IS DISTINCT FROM OLD.max_gostiju
    OR NEW.confidence_score IS DISTINCT FROM OLD.confidence_score
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
  THEN
    RAISE EXCEPTION 'Agencija sme da menja samo status (published/paused), dostupno_mesta i kontakt_url.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    AND (OLD.status NOT IN ('published', 'paused') OR NEW.status NOT IN ('published', 'paused'))
  THEN
    RAISE EXCEPTION 'Agencija može samo da prebaci status između published i paused.';
  END IF;

  RETURN NEW;
END;
$$;

GRANT SELECT ("cena_tip", "cena_po_osobi") ON "offers" TO anon;
