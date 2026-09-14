"use client";

import { useActionState } from "react";
import { updateAgencyProfile } from "./actions";

export function AgencyProfileForm({
  agencyId,
  naziv,
  kontakt,
  website,
  readOnly,
}: {
  agencyId: string;
  naziv: string;
  kontakt: string;
  website: string | null;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateAgencyProfile, null);

  return (
    <form action={formAction} className="mt-4 flex max-w-md flex-col gap-3">
      <input type="hidden" name="agencyId" value={agencyId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="naziv" className="text-xs font-medium text-gray-600">
          Naziv agencije
        </label>
        <input
          id="naziv"
          name="naziv"
          defaultValue={naziv}
          required
          disabled={readOnly || pending}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="kontakt" className="text-xs font-medium text-gray-600">
          Kontakt (telefon/email)
        </label>
        <input
          id="kontakt"
          name="kontakt"
          defaultValue={kontakt}
          required
          disabled={readOnly || pending}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="website" className="text-xs font-medium text-gray-600">
          Website (opciono)
        </label>
        <input
          id="website"
          name="website"
          type="url"
          placeholder="https://…"
          defaultValue={website ?? ""}
          disabled={readOnly || pending}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>
      {!readOnly && (
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Čuvam…" : "Sačuvaj"}
        </button>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Sačuvano.</p>}
    </form>
  );
}
