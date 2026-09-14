-- Agencija (agency_admin) sme da izmeni SVOJE osnovne podatke (naziv,
-- kontakt, website) bez čekanja na superadmin — do sad je postojala samo
-- "agencies_update_superadmin" policy, agencija nije mogla da izmeni ni svoj
-- sopstveni naziv. pib/cpc_cena/mesecni_budzet_klikova/status ostaju
-- isključivo superadmin — to su poslovni/naplatni parametri, ne "profil"
-- podaci. agency_user namerno nije uključen (isti obrazac kao Tim
-- upravljanje — vidi team/actions.ts, samo agency_admin/superadmin menjaju
-- podatke o agenciji).
--
-- Isti dvoslojni pristup kao offers_update_agency_own/offers_agency_edit_scope
-- (Faza 2, pauza ponuda): RLS policy ograničava KOJI red, trigger ograničava
-- KOJE kolone.

CREATE POLICY "agencies_update_agency_admin" ON "agencies"
  FOR UPDATE
  USING (
    public.current_profile_role() = 'agency_admin'
    AND id = public.current_profile_agency_id()
  )
  WITH CHECK (
    public.current_profile_role() = 'agency_admin'
    AND id = public.current_profile_agency_id()
  );

CREATE OR REPLACE FUNCTION public.enforce_agency_self_edit_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.current_profile_role() <> 'agency_admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.pib IS DISTINCT FROM OLD.pib
    OR NEW.cpc_cena IS DISTINCT FROM OLD.cpc_cena
    OR NEW.mesecni_budzet_klikova IS DISTINCT FROM OLD.mesecni_budzet_klikova
    OR NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'Agencija sme da menja samo naziv, kontakt i website.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER agencies_self_edit_scope
  BEFORE UPDATE ON "agencies"
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agency_self_edit_scope();
