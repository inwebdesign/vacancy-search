"use client";

import { useActionState } from "react";
import { setPassword, type SetPasswordState } from "./actions";

const initialState: SetPasswordState = null;

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    setPassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Nova lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Čuvanje…" : "Postavi lozinku"}
      </button>
    </form>
  );
}
