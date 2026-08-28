"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
