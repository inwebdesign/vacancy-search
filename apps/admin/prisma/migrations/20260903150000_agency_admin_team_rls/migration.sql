-- Faza 1, Korak 7: agency_admin sme da menja ulogu (role) kolega iz
-- sopstvene agencije (agency_admin <-> agency_user), ne i da ih premesti u
-- drugu agenciju niti da ih promovise na superadmin/operator.
--
-- DELETE namerno NIJE dodat ovde: "Ukloni clana" u Koraku 7 briše
-- auth.users red (ON DELETE CASCADE briše i profiles), sto zahteva
-- service_role klijent i rucnu proveru dozvole u server akciji - ne ide
-- kroz RLS na profiles, pa posebna DELETE policy ovde ne bi nikad bila
-- iskoriscena.

CREATE POLICY "profiles_update_agency_admin" ON "profiles"
  FOR UPDATE
  USING (
    public.current_profile_role() = 'agency_admin'
    AND agency_id = public.current_profile_agency_id()
  )
  WITH CHECK (
    public.current_profile_role() = 'agency_admin'
    AND agency_id = public.current_profile_agency_id()
    AND role IN ('agency_admin', 'agency_user')
  );
