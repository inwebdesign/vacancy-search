-- CreateEnum
CREATE TYPE "profile_role" AS ENUM ('superadmin', 'operator', 'agency_admin', 'agency_user');

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "naziv" TEXT NOT NULL,
    "pib" TEXT NOT NULL,
    "kontakt" TEXT NOT NULL,
    "cpc_cena" DECIMAL(10,2) NOT NULL,
    "mesecni_budzet_klikova" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "agency_id" UUID,
    "role" "profile_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agencies_pib_key" ON "agencies"("pib");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (ručno dodato, van Prisma modela — profiles.id se poklapa sa Supabase Auth korisnikom)
-- "id (ref auth.users)" iz projektnog brief-a: prava FK referenca ka auth.users, koji Prisma ne upravlja.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
