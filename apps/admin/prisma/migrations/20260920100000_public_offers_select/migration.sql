-- Plan javnog sajta (docs/PLAN-JAVNI-SAJT.md), Korak 1: anonimni posetilac
-- (Supabase "anon" rola, bez sesije/JWT-a sa "sub" claim-om) sme da čita
-- SAMO objavljene ponude. Ovo je jedina izmena baze potrebna da bi
-- apps/site (novi Next.js javni sajt) mogao da čita offers preko anon
-- ključa direktno sa servera (Server Components), bez ikakvog posebnog
-- API sloja — RLS je stvarna granica, isti princip kao svuda u projektu.
--
-- Postojeće offers_select policy (superadmin/operator/vlasnička agencija)
-- ostaje netaknuta — RLS politike unutar istog FOR SELECT se OR-uju, tako
-- da ovo samo DODAJE mogućnost anon roli da vidi published redove, ne
-- menja ništa za već ulogovane korisnike.

CREATE POLICY "offers_select_public" ON "offers"
  FOR SELECT
  TO anon
  USING (status = 'published');
