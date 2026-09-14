-- Faza 2: nov "paused" status (van originalnog brief-a, vidi schema.prisma
-- komentar). U posebnoj migraciji jer Postgres ne dozvoljava korišćenje nove
-- enum vrednosti u istoj transakciji u kojoj je dodata (ALTER TYPE ... ADD
-- VALUE mora biti commit-ovan pre nego što ga sledeća migracija referencira
-- u RLS policy-ju/trigeru).

ALTER TYPE "offer_status" ADD VALUE 'paused';
