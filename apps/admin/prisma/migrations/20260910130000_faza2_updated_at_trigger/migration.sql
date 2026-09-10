-- Faza 2, Korak 3 fix: uploads.updated_at i offers.updated_at nemaju
-- DB-level default/trigger. Prisma-ov @updatedAt automatski postavlja
-- vrednost SAMO kad Prisma Client sam radi upis — ova aplikacija u
-- runtime-u UVEK piše preko Supabase klijenta (session ili service_role),
-- nikad preko Prisma Client-a, pa je svaki INSERT bez eksplicitnog
-- updated_at pucao na NOT NULL constraint (otkriveno self-testom Koraka 3).

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

ALTER TABLE "uploads" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
CREATE TRIGGER "set_uploads_updated_at"
  BEFORE UPDATE ON "uploads"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE "offers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
CREATE TRIGGER "set_offers_updated_at"
  BEFORE UPDATE ON "offers"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
