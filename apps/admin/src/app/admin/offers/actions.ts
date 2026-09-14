"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { logAudit } from "@/lib/audit/log";
import { ingestUpload } from "@/lib/offers/ingest";

const BUCKET = "agency-uploads";

const MIME_TO_TIP: Record<string, "excel" | "csv" | "pdf"> = {
  "text/csv": "csv",
  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  "application/pdf": "pdf",
};

export type UploadFileState = {
  error?: string;
  success?: boolean;
  summary?: string;
} | null;

// Faza 2, Korak 2: prima i čuva fajl. Korak 3/4: odmah zatim parsira
// CSV/Excel/PDF (ingestUpload) — SINHRONO, privremeno rešenje dok se ne
// odluči pravi background-job mehanizam (brief traži async + realtime
// status, vidi napomenu u lib/offers/ingest.ts).
export async function uploadFile(
  _prevState: UploadFileState,
  formData: FormData,
): Promise<UploadFileState> {
  const me = await getCurrentProfile();
  if (!me || (me.role !== "agency_admin" && me.role !== "agency_user")) {
    return { error: "Nemate dozvolu za upload." };
  }
  if (!me.agencyId) {
    return { error: "Nalog nije vezan za agenciju." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Izaberi fajl." };
  }

  const tip = MIME_TO_TIP[file.type];
  if (!tip) {
    return { error: "Podržani formati: CSV, Excel (.xlsx/.xls), PDF." };
  }

  const supabase = await createClient();
  // Prvi segment putanje MORA biti agency_id — Storage RLS (Korak 2
  // migracija) se oslanja tačno na taj format.
  const path = `${me.agencyId}/${randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    return { error: `Upload fajla nije uspeo: ${uploadError.message}` };
  }

  const { data: uploadRow, error: insertError } = await supabase
    .from("uploads")
    .insert({
      agency_id: me.agencyId,
      originalni_fajl_url: path,
      tip,
      status: "pending",
      uploaded_by: me.userId,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Upis u bazu nije uspeo: ${insertError.message}` };
  }

  await logAudit({
    actorId: me.userId,
    actorEmail: me.email,
    action: "upload.create",
    targetTable: "uploads",
    targetId: uploadRow.id,
    diff: { agency_id: me.agencyId, tip, file_name: file.name },
  });

  revalidatePath("/admin/offers");

  try {
    const result = await ingestUpload(uploadRow.id);
    revalidatePath("/admin/offers");

    if (result.missingColumns.length > 0) {
      const reason =
        tip === "pdf"
          ? result.missingColumns.join(", ")
          : `nedostaju kolone: ${result.missingColumns.join(", ")}`;
      return {
        error: `Fajl je sačuvan, ali obrada nije uspela — ${reason}.`,
      };
    }

    const parts = [`${result.inserted} ponuda upisano/ažurirano`];
    if (result.expired > 0) parts.push(`${result.expired} isteklo`);
    if (result.skippedRows > 0)
      parts.push(`${result.skippedRows} redova preskočeno (nevalidni podaci)`);

    return { success: true, summary: parts.join(", ") + "." };
  } catch (err) {
    return {
      error: `Fajl je sačuvan, ali obrada nije uspela: ${err instanceof Error ? err.message : "nepoznata greška"}`,
    };
  }
}
