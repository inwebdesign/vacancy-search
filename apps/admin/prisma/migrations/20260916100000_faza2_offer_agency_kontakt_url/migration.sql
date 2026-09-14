-- Agencija sme da izmeni i kontakt_url svoje ponude (PDF ekstrakcija
-- trenutno postavlja isti opšti link agencije na SVAKU ponudu iz tog
-- PDF-a, jer cenovnici obično nemaju link po apartmanu — agencija treba
-- ručno da doda link ka konkretnom apartmanu da klik ne bi uvek vodio na
-- home page). Isto pravo kao status/dostupno_mesta (Faza 2, pauza ponude),
-- vidi migraciju 20260914100001.
--
-- Dodatno: prethodna verzija trigera je blokirala BILO KOJU izmenu na
-- redu čiji status nije published/paused, čak i kad se sam status uopšte
-- ne menja — to je sprečavalo agenciju da ranije doda kontakt_url na
-- pending_review ponudu (pre nego što je uopšte objavljena). Nova verzija
-- proverava status-prelaz samo kad se status stvarno menja.

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
