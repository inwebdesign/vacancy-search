"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleButton({ next }: { next?: string }) {
  async function signInWithGoogle() {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      className="rounded border border-gray-300 px-3 py-2 text-sm font-medium"
    >
      Prijavi se preko Google-a
    </button>
  );
}
