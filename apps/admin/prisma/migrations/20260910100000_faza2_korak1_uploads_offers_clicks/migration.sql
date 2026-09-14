-- Faza 2, Korak 1: uploads, offers, clicks (brief sekcija 5, 8, 9).
-- Rucno pisano (shadow DB nema auth semu pa `prisma migrate dev` ne moze da
-- generise diff, isti razlog kao za sve dosadasnje migracije u ovom repo-u).

-- CreateEnum
CREATE TYPE "upload_type" AS ENUM ('excel', 'csv', 'pdf');
CREATE TYPE "upload_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "offer_status" AS ENUM ('pending_review', 'published', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "originalni_fajl_url" TEXT NOT NULL,
    "tip" "upload_type" NOT NULL,
    "status" "upload_status" NOT NULL DEFAULT 'pending',
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "naziv" TEXT NOT NULL,
    "destinacija" TEXT NOT NULL,
    "datum_polaska" DATE NOT NULL,
    "datum_povratka" DATE NOT NULL,
    "cena_eur" DECIMAL(10,2) NOT NULL,
    "max_gostiju" INTEGER NOT NULL,
    "dostupno_mesta" INTEGER NOT NULL,
    "kontakt_url" TEXT NOT NULL,
    "confidence_score" DECIMAL(3,2),
    "status" "offer_status" NOT NULL DEFAULT 'pending_review',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offers_agency_id_destinacija_datum_polaska_key" ON "offers"("agency_id", "destinacija", "datum_polaska");
CREATE INDEX "offers_destinacija_datum_polaska_dostupno_mesta_idx" ON "offers"("destinacija", "datum_polaska", "dostupno_mesta");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "offers" ADD CONSTRAINT "offers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clicks" ADD CONSTRAINT "clicks_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: uploads
-- agency_admin/agency_user vide i insertuju samo za svoju agenciju (brief
-- sekcija 6: "vidi/uploaduje samo za svoju agenciju"). Nema UPDATE/DELETE
-- policy za te uloge — status azurira parsing pipeline preko service_role
-- (Korak 3/4), ne agencija direktno.
ALTER TABLE "uploads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploads_select" ON "uploads"
  FOR SELECT
  USING (
    public.current_profile_role() IN ('superadmin', 'operator')
    OR agency_id = public.current_profile_agency_id()
  );

CREATE POLICY "uploads_insert_agency" ON "uploads"
  FOR INSERT
  WITH CHECK (
    public.current_profile_role() IN ('agency_admin', 'agency_user')
    AND agency_id = public.current_profile_agency_id()
  );

CREATE POLICY "uploads_delete_superadmin" ON "uploads"
  FOR DELETE
  USING (public.current_profile_role() = 'superadmin');

-- RLS: offers
-- agency_admin/agency_user (svoja agencija) i superadmin/operator (sve) citaju.
-- UPDATE (review queue moderacija) je superadmin/operator, ne agencija — brief
-- sekcija 6: operator "uredjuje ponude svih agencija", agencija menja preko
-- re-upload-a (pun snapshot), ne direktnim editom reda. Nema INSERT policy za
-- nikoga — offers upisuje iskljucivo parsing pipeline preko service_role.
ALTER TABLE "offers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_select" ON "offers"
  FOR SELECT
  USING (
    public.current_profile_role() IN ('superadmin', 'operator')
    OR agency_id = public.current_profile_agency_id()
  );

CREATE POLICY "offers_update_superadmin_operator" ON "offers"
  FOR UPDATE
  USING (public.current_profile_role() IN ('superadmin', 'operator'))
  WITH CHECK (public.current_profile_role() IN ('superadmin', 'operator'));

CREATE POLICY "offers_delete_superadmin" ON "offers"
  FOR DELETE
  USING (public.current_profile_role() = 'superadmin');

-- RLS: clicks
-- agency_user NEMA pristup uopste (brief sekcija 6: "bez pristupa
-- fakturisanju" — clicks je osnova CPC naplate). agency_admin vidi klikove
-- svoje agencije, superadmin/operator sve. Nema INSERT policy za nikoga —
-- klik dolazi sa javnog sajta bez ulogovane sesije, upisuje se iskljucivo
-- preko service_role iz click-out endpoint-a (Korak 6).
ALTER TABLE "clicks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clicks_select" ON "clicks"
  FOR SELECT
  USING (
    public.current_profile_role() IN ('superadmin', 'operator')
    OR (
      public.current_profile_role() = 'agency_admin'
      AND agency_id = public.current_profile_agency_id()
    )
  );
