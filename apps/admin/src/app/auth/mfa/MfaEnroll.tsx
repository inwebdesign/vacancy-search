"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Enroll TOTP faktora: enroll -> challenge -> verify (Supabase Auth MFA API).
// Korak 4 traži MFA za admin naloge; koje uloge su u obavezi (superadmin,
// operator, ili obe) proverava se u Koraku 6/7 zajedno sa role-based
// pristupom, kad postoji middleware koji čita profiles.role.
export function MfaEnroll() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa
      .enroll({ factorType: "totp" })
      .then(({ data, error }) => {
        if (error) {
          setError("Nije uspelo pokretanje MFA podešavanja.");
          return;
        }
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
      });
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError("Nije uspela provera koda.");
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    setVerifying(false);
    if (verifyError) {
      setError("Neispravan kod, pokušaj ponovo.");
      return;
    }

    router.push("/");
  }

  if (error && !qrCode) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!qrCode) {
    return <p className="text-sm text-gray-500">Učitavanje…</p>;
  }

  return (
    <form onSubmit={verify} className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">
        Skeniraj kod u aplikaciji za autentifikaciju (npr. Google
        Authenticator), pa unesi 6-cifreni kod.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI iz Supabase-a, ne next/image kandidat */}
      <img src={qrCode} alt="MFA QR kod" width={200} height={200} />
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
        className="w-32 rounded border border-gray-300 px-3 py-2 text-center text-sm tracking-widest"
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={verifying}
        className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {verifying ? "Proveravanje…" : "Potvrdi"}
      </button>
    </form>
  );
}
