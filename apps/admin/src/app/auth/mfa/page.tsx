import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaEnroll } from "./MfaEnroll";

export default async function MfaPage() {
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
        <h1 className="mb-6 text-center text-xl font-semibold">
          Podešavanje MFA
        </h1>
        <MfaEnroll />
      </div>
    </main>
  );
}
