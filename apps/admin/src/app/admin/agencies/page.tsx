import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "../_components/ComingSoon";
import { AgencyProfileForm } from "./AgencyProfileForm";

// Faza 2: agencija (agency_admin/agency_user) vidi/menja podatke SVOJE
// agencije ovde -- do sad je ovo bio "coming soon" plejsholder za sve uloge,
// pa naziv agencije nije imao gde da se popuni sem ručno preko baze
// (vidi RLS migraciju 20260915100000). Pun pregled/upravljanje svim
// agencijama za superadmin/operator ostaje "coming soon" -- veći zaseban
// deo posla, van ovog zahteva.
export default async function AgenciesPage() {
  const me = await requireRole([
    "superadmin",
    "operator",
    "agency_admin",
    "agency_user",
  ]);

  if (me.role === "superadmin" || me.role === "operator") {
    return <ComingSoon title="Agencije" />;
  }

  if (!me.agencyId) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Agencija</h1>
        <p className="mt-2 text-sm text-gray-400">
          Nalog nije vezan za agenciju.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, naziv, kontakt, website")
    .eq("id", me.agencyId)
    .single();

  if (!agency) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Agencija</h1>
        <p className="mt-2 text-sm text-gray-400">Agencija nije pronađena.</p>
      </div>
    );
  }

  const readOnly = me.role !== "agency_admin";

  return (
    <div>
      <h1 className="text-xl font-semibold">Agencija</h1>
      <p className="mt-1 text-sm text-gray-400">
        {readOnly
          ? "Osnovni podaci o vašoj agenciji — izmenu radi agency_admin."
          : "Ovi podaci (naziv pre svega) se vide na sajtu — proveri da su tačni."}
      </p>
      <AgencyProfileForm
        agencyId={agency.id}
        naziv={agency.naziv}
        kontakt={agency.kontakt}
        website={agency.website}
        readOnly={readOnly}
      />
    </div>
  );
}
