"use client";

import { useActionState, useState } from "react";
import { inviteTeamMember } from "./actions";
import type { Role } from "@/lib/auth/current-profile";

export function InviteForm({
  callerRole,
  callerAgencyId,
  agencies,
}: {
  callerRole: Role;
  callerAgencyId: string | null;
  agencies: { id: string; naziv: string }[];
}) {
  const [state, formAction, pending] = useActionState(inviteTeamMember, null);
  const [role, setRole] = useState<Role>("agency_user");

  const roleOptions: Role[] =
    callerRole === "superadmin"
      ? ["superadmin", "operator", "agency_admin", "agency_user"]
      : ["agency_admin", "agency_user"];

  const needsAgencyPicker =
    callerRole === "superadmin" && (role === "agency_admin" || role === "agency_user");

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-xs font-medium">
          Uloga
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {callerRole === "agency_admin" && (
        <input type="hidden" name="agencyId" value={callerAgencyId ?? ""} />
      )}
      {needsAgencyPicker && (
        <div className="flex flex-col gap-1">
          <label htmlFor="agencyId" className="text-xs font-medium">
            Agencija
          </label>
          <select
            id="agencyId"
            name="agencyId"
            required
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naziv}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Slanje…" : "Pozovi"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="w-full text-sm text-green-600">Pozivnica poslata.</p>
      )}
    </form>
  );
}
