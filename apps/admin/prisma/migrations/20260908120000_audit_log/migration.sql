-- Faza 1, Korak 8: audit_log.
--
-- Namerno BEZ FK na actor_id/target_id: subjekat (profil, kasnije agencija,
-- ponuda...) moze kasnije biti obrisan (npr. "Ukloni clana" iz Koraka 7 brise
-- auth.users, sto cascade-uje profiles), a trag treba da ostane citljiv i
-- posle toga. actor_email je snapshot u trenutku upisa, ne live referenca.

CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" UUID,
    "diff" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_created_at_idx" ON "audit_log" ("created_at" DESC);

-- RLS: samo superadmin/operator citaju (poklapa se sa nav pravima iz Koraka
-- 7). Namerno nema INSERT/UPDATE/DELETE policy — upis ide iskljucivo preko
-- service_role (lib/audit/log.ts), koji zaobilazi RLS; bez policy-ja, niko
-- preko obicne (anon/user) sesije ne moze da pise niti menja log.
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_superadmin_operator" ON "audit_log"
  FOR SELECT
  USING (public.current_profile_role() IN ('superadmin', 'operator'));
