-- Bag nađen pri direktnom radu na bazi (Faza 2 sajta, pomeranje zastarelih
-- datuma): offers_agency_edit_scope i agencies_self_edit_scope trigeri
-- proveravaju "current_profile_role() NOT IN (...)" / "<> 'agency_admin'".
-- current_profile_role() vraća NULL kad nema JWT sesije uopšte (sirova
-- Postgres konekcija preko DATABASE_URL, migracije, service_role bez
-- eksplicitno postavljenih claim-ova) — a u SQL-u "NULL NOT IN (...)" i
-- "NULL <> x" su NULL, ne TRUE. IF NULL se u PL/pgSQL tretira kao FALSE,
-- pa se "nije agencija, pusti prolaz" grana NIJE izvršavala kad uopšte
-- nema sesije — triger je pogrešno primenjivao agencijsko ograničenje na
-- konekcije koje nisu agencijska sesija.
--
-- Ispravka: COALESCE u prazan string pre poređenja — NULL rola se time
-- ponaša isto kao "očigledno nije agencija", što je i bio nameravan smisao
-- (RLS već odlučuje KOJI red je vidljiv; ovaj triger samo dodatno sužava
-- ŠTA agencijska sesija sme da menja na redu koji već vidi).

CREATE OR REPLACE FUNCTION public.enforce_offer_agency_edit_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(public.current_profile_role()::text, '') NOT IN ('agency_admin', 'agency_user') THEN
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

CREATE OR REPLACE FUNCTION public.enforce_agency_self_edit_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(public.current_profile_role()::text, '') <> 'agency_admin' THEN
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
