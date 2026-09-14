"use client";

import { useState, useTransition } from "react";
import { updateOfferKontaktUrl } from "./actions";

// Link ka konkretnom apartmanu na sajtu agencije — klik na sajtu vodi ovde
// (vidi /go/[offerId]). PDF ekstrakcija (Korak 4) svakoj ponudi iz istog
// PDF-a postavlja isti opšti link agencije (nema linka po apartmanu u
// cenovniku), pa ovo polje daje agenciji način da to ispravi.
export function OfferKontaktUrlControl({
  offerId,
  kontaktUrl,
}: {
  offerId: string;
  kontaktUrl: string;
}) {
  const [value, setValue] = useState(kontaktUrl);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    const trimmed = value.trim();
    if (trimmed === kontaktUrl.trim()) return;
    startTransition(async () => {
      const result = await updateOfferKontaktUrl(offerId, trimmed);
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={pending}
        placeholder="https://…"
        title="Link ka konkretnom apartmanu na sajtu agencije"
        className="w-48 rounded border border-gray-300 px-1.5 py-0.5 text-xs disabled:opacity-50"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
