"use client";

import { useActionState } from "react";
import { uploadFile } from "./actions";

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadFile, null);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-xs font-medium">
          Fajl (CSV, Excel, PDF)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          required
          className="text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Uploadujem…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="w-full text-sm text-green-600">Upload uspešan.</p>
      )}
    </form>
  );
}
