-- Faza 2: agencija sme da pauzira/reaktivira SVOJU već objavljenu ponudu i
-- da menja dostupno_mesta ("upravljanje kapacitetom") bez čekanja na
-- superadmin/operator. Sve ostalo (cena, datumi, naziv, destinacija,
-- kontakt_url...) i dalje menja isključivo tim, preko review queue-a —
-- LLM/parsing ekstrakcija je verifikovana jednom, agencija je ne menja tiho
-- bez traga; za te izmene agencija i dalje šalje novi upload (pun snapshot).
--
-- RLS policy sama po sebi ne ume da ograniči KOJE kolone smeju da se menjaju
-- (samo koji redovi) — zato dodatno postoji BEFORE UPDATE trigger koji, samo
-- kad je akter agency_admin/agency_user, odbija promenu bilo koje kolone
-- osim status i dostupno_mesta, i dozvoljava samo published<->paused prelaz.
-- Superadmin/operator (i service_role iz parsing pipeline-a, koji nema
-- profil pa current_profile_role() vraća NULL) trigerom nisu ograničeni —
-- isto ponašanje kao postojeća offers_update_superadmin_operator policy.

CREATE POLICY "offers_update_agency_own" ON "offers"
  FOR UPDATE
  USING (
    public.current_profile_role() IN ('agency_admin', 'agency_user')
    AND agency_id = public.current_profile_agency_id()
  )
  WITH CHECK (
    public.current_profile_role() IN ('agency_admin', 'agency_user')
    AND agency_id = public.current_profile_agency_id()
  );

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
    OR NEW.max_gostiju IS DISTINCT FROM OLD.max_gostiju
    OR NEW.kontakt_url IS DISTINCT FROM OLD.kontakt_url
    OR NEW.confidence_score IS DISTINCT FROM OLD.confidence_score
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
  THEN
    RAISE EXCEPTION 'Agencija sme da menja samo status (published/paused) i dostupno_mesta.';
  END IF;

  IF OLD.status NOT IN ('published', 'paused') THEN
    RAISE EXCEPTION 'Agencija može da pauzira/reaktivira samo već objavljenu ponudu.';
  END IF;

  IF NEW.status NOT IN ('published', 'paused') THEN
    RAISE EXCEPTION 'Agencija može samo da prebaci status između published i paused.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER offers_agency_edit_scope
  BEFORE UPDATE ON "offers"
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_offer_agency_edit_scope();
