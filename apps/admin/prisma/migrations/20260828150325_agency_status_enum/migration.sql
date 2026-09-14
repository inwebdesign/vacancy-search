-- CreateEnum
CREATE TYPE "agency_status" AS ENUM ('pending', 'active', 'suspended');

-- AlterTable
ALTER TABLE "agencies" DROP COLUMN "status",
ADD COLUMN     "status" "agency_status" NOT NULL DEFAULT 'pending';
