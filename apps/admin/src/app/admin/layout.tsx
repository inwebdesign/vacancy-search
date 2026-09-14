import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, type Role } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  {
    href: "/admin",
    label: "Početna",
    roles: ["superadmin", "operator", "agency_admin", "agency_user"],
  },
  {
    href: "/admin/agencies",
    label: "Agencije",
    roles: ["superadmin", "operator", "agency_admin", "agency_user"],
  },
  { href: "/admin/team", label: "Tim", roles: ["superadmin", "agency_admin"] },
  {
    href: "/admin/offers",
    label: "Ponude",
    roles: ["superadmin", "operator", "agency_admin", "agency_user"],
  },
  {
    href: "/admin/review",
    label: "Review queue",
    roles: ["superadmin", "operator"],
  },
  {
    href: "/admin/stats",
    label: "Statistika",
    roles: ["superadmin", "operator", "agency_admin"],
  },
  {
    href: "/admin/audit-log",
    label: "Audit log",
    roles: ["superadmin", "operator"],
  },
];

// Faza 1, Korak 7: nav skelet. Filtrira linkove po ulozi — ovo je samo UI,
// ne stvarna zaštita (svaka stranica sama zove requireRole, vidi
// lib/auth/require-role.ts). Redirect ovde (nema profila) je odbrana u
// dubinu, isto kao u Koraku 6 middleware-u.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/admin");
  }

  const links = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  // Nudge: ako je agencijski nalog, a naziv agencije još nije popunjen (npr.
  // nalog kreiran pre nego što je agencija stigla da unese svoje podatke),
  // podseti je da to uradi na stranici "Agencije" (vidi agencies/page.tsx).
  let showAgencyNameNudge = false;
  if (
    (profile.role === "agency_admin" || profile.role === "agency_user") &&
    profile.agencyId
  ) {
    const supabase = await createClient();
    const { data: agency } = await supabase
      .from("agencies")
      .select("naziv")
      .eq("id", profile.agencyId)
      .single();
    showAgencyNameNudge = !agency?.naziv?.trim();
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <span className="text-sm text-gray-600">
          {profile.email} — <span className="font-medium">{profile.role}</span>
        </span>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Odjavi se
          </button>
        </form>
      </header>
      {showAgencyNameNudge && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
          Naziv agencije još nije unet —{" "}
          <Link href="/admin/agencies" className="font-medium underline">
            unesi ga ovde
          </Link>
          .
        </div>
      )}
      <div className="flex">
        <nav className="w-48 shrink-0 border-r border-gray-200 px-4 py-6">
          <ul className="flex flex-col gap-2 text-sm">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
