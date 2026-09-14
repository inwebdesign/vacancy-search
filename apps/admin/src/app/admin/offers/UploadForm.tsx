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
      {pending && (
        <p className="flex w-full items-center gap-2 text-sm text-gray-600">
          <svg
            className="h-4 w-4 animate-spin text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Obrada u toku — PDF preko AI-ja može potrajati i do par minuta,
          CSV/Excel je brže.
        </p>
      )}
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="w-full text-sm text-green-600">
          {state.summary ?? "Upload uspešan."}
        </p>
      )}
    </form>
  );
}
