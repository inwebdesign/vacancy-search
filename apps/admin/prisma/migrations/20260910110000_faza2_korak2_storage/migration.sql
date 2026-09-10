-- Faza 2, Korak 2: Supabase Storage bucket za originalne upload fajlove
-- (brief: "original fajl se cuva nepromenjen, nikad se ne brise").
--
-- Path konvencija: {agency_id}/{uuid}-{original_filename} — prvi segment
-- putanje MORA biti agency_id, jer se na tome zasniva Storage RLS ispod
-- (storage.foldername(name))[1]). storage.objects vec ima RLS ukljucen po
-- default-u na Supabase-u, ne diramo ENABLE ROW LEVEL SECURITY ovde.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-uploads',
  'agency-uploads',
  false,
  10485760,
  ARRAY[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- agency_admin/agency_user upload-uju samo u sopstveni agency_id folder.
CREATE POLICY "agency_uploads_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-uploads'
    AND public.current_profile_role() IN ('agency_admin', 'agency_user')
    AND (storage.foldername(name))[1] = public.current_profile_agency_id()::text
  );

-- Citanje: sopstvena agencija, ili superadmin/operator (sve).
CREATE POLICY "agency_uploads_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'agency-uploads'
    AND (
      public.current_profile_role() IN ('superadmin', 'operator')
      OR (storage.foldername(name))[1] = public.current_profile_agency_id()::text
    )
  );

-- Brisanje samo superadmin (fajlovi se u normalnom toku nikad ne brisu).
CREATE POLICY "agency_uploads_delete_superadmin" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'agency-uploads'
    AND public.current_profile_role() = 'superadmin'
  );
