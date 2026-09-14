import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

// Prva stanica posle invite mejla — korisnik već ima sesiju (uspostavljena
// preko /auth/callback), samo mu nedostaje lozinka.
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-xl font-semibold">
          Dobrodošao/la
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Postavi lozinku za svoj nalog.
        </p>
        <SetPasswordForm />
      </div>
    </main>
  );
}
