import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Faza 1, Korak 6: skelet zaštićene rute — middleware već redirect-uje
// neulogovane na /login pre nego što stignu ovde; getUser() ispod je odbrana
// u dubinu, ne primarna zaštita. Nav i pravi sadržaj dolaze u Koraku 7
// (role-based navigacija).
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Odjavi se
          </button>
        </form>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Ulogovan kao <span className="font-medium">{user.email}</span>
        {profile?.role && ` — uloga: ${profile.role}`}
      </p>
      <p className="mt-6 text-sm text-gray-400">
        Faza 1, Korak 6: skelet zaštićene rute. Nav i sadržaj dolaze u Koraku
        7.
      </p>
    </main>
  );
}
