-- Faza 1, Korak 5: RLS na agencies i profiles.
-- Prisma ne modeluje RLS/funkcije, pa je ovo ručno napisan raw SQL (standardan
-- pristup za Supabase + Prisma — RLS uvek ide kroz migracije, nikad ručno u UI-ju).

-- Helper funkcije, SECURITY DEFINER da bi zaobišle RLS na profiles kad se
-- pozovu iz policy-ja na samoj profiles tabeli (sprečava beskonačnu
-- rekurziju — RLS koji čita profiles da bi odlučio RLS na profiles).
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS profile_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_profile_agency_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid()
$$;

-- agencies
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agencies_select" ON "agencies"
  FOR SELECT
  USING (
    public.current_profile_role() IN ('superadmin', 'operator')
    OR id = public.current_profile_agency_id()
  );

CREATE POLICY "agencies_insert_superadmin" ON "agencies"
  FOR INSERT
  WITH CHECK (public.current_profile_role() = 'superadmin');

CREATE POLICY "agencies_update_superadmin" ON "agencies"
  FOR UPDATE
  USING (public.current_profile_role() = 'superadmin')
  WITH CHECK (public.current_profile_role() = 'superadmin');

CREATE POLICY "agencies_delete_superadmin" ON "agencies"
  FOR DELETE
  USING (public.current_profile_role() = 'superadmin');

-- profiles
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Sopstveni red, kolege iz iste agencije, ili superadmin/operator (svi).
CREATE POLICY "profiles_select" ON "profiles"
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.current_profile_role() IN ('superadmin', 'operator')
    OR agency_id = public.current_profile_agency_id()
  );

-- Samo superadmin upravlja nalozima (Korak 4: invite šalje superadmin).
-- UPDATE namerno nije dozvoljen za "sopstveni red" — sprečava da korisnik
-- sebi promeni role/agency_id (privilege escalation) bez posebne
-- kolonske zaštite koja u Fazi 1 još ne postoji.
CREATE POLICY "profiles_insert_superadmin" ON "profiles"
  FOR INSERT
  WITH CHECK (public.current_profile_role() = 'superadmin');

CREATE POLICY "profiles_update_superadmin" ON "profiles"
  FOR UPDATE
  USING (public.current_profile_role() = 'superadmin')
  WITH CHECK (public.current_profile_role() = 'superadmin');

CREATE POLICY "profiles_delete_superadmin" ON "profiles"
  FOR DELETE
  USING (public.current_profile_role() = 'superadmin');
