"use client";

import { useTransition } from "react";
import { updateMemberRole, removeMember } from "./actions";
import type { Role } from "@/lib/auth/current-profile";

const ALL_ROLES: Role[] = ["superadmin", "operator", "agency_admin", "agency_user"];
const ASSIGNABLE_ROLES: Role[] = ["agency_admin", "agency_user"];

export function MemberActions({
  memberId,
  currentRole,
  callerRole,
}: {
  memberId: string;
  currentRole: Role;
  callerRole: Role;
}) {
  const [pending, startTransition] = useTransition();
  const roleOptions = callerRole === "superadmin" ? ALL_ROLES : ASSIGNABLE_ROLES;

  function handleRoleChange(role: string) {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, role);
      if (result?.error) alert(result.error);
    });
  }

  function handleRemove() {
    if (!confirm("Ukloniti ovog člana? Ovo briše i njegov login nalog.")) return;
    startTransition(async () => {
      const result = await removeMember(memberId);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentRole}
        disabled={pending}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
      >
        {roleOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={handleRemove}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        Ukloni
      </button>
    </div>
  );
}
