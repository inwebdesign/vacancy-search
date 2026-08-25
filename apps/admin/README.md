# Slobodno — Admin Dashboard

Faza 1, Korak 1: skelet projekta (Next.js App Router + TypeScript + Tailwind + Prisma, prazna šema).

## Setup

```bash
npm install
cp .env.example .env.local   # popuni DATABASE_URL i Supabase ključeve
npx prisma generate
npm run dev
```

Otvori http://localhost:3000 — treba da vidiš placeholder stranicu "Slobodno — Admin".

## Struktura

```
src/app/          Next.js App Router stranice
prisma/schema.prisma   Prisma šema (prazna — modeli dolaze u Koraku 3)
.env.example       Šablon za environment varijable (NIKAD ne commit-uj .env.local)
```

## Sledeći koraci (Faza 1)

- Korak 2: Supabase projekat + konekcija (DATABASE_URL, Supabase ključevi)
- Korak 3: `agencies` i `profiles` tabele u Prisma šemi + migracija
- Korak 4: Auth (email/password + Google, invite-only)
- Korak 5: RLS politike
- Korak 6: middleware za `/admin/*`
- Korak 7: role-based navigacija (skelet)
- Korak 8: audit log
