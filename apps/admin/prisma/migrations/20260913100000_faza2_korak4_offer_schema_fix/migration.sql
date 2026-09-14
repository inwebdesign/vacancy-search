-- Faza 2, Korak 4: sema izmene otkrivene na pravom PDF-u partner agencije
-- (cenovna matrica: ista destinacija+datum ima vise tipova soba, svaki sa
-- svojom cenom/kapacitetom - videti razgovor).

-- 1) Agencije trebaju pravi "website" fallback za offers.kontakt_url kad
--    izvor (PDF cenovnik) nema link po ponudi, samo opsti kontakt agencije.
ALTER TABLE "agencies" ADD COLUMN "website" TEXT;

-- 2) dostupno_mesta nije uvek poznato iz izvora (PDF cenovnici obicno uopste
--    ne navode broj slobodnih mesta) - ostaje NULL dok se ne odluci kako se
--    to prikazuje na UI.
ALTER TABLE "offers" ALTER COLUMN "dostupno_mesta" DROP NOT NULL;

-- 3) Unique constraint prosiren sa "naziv" - ista destinacija+datum sad moze
--    imati vise ponuda (razliciti tipovi soba/vila), naziv ih razlikuje.
DROP INDEX "offers_agency_id_destinacija_datum_polaska_key";
CREATE UNIQUE INDEX "offers_agency_id_naziv_destinacija_datum_polaska_key"
  ON "offers" ("agency_id", "naziv", "destinacija", "datum_polaska");
