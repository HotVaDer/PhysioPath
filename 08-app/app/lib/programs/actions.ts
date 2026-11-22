"use server";
// «Νέος σύνδεσμος» on the approved-program page (owner or physio): the patient's links for this program
// are replaced, so a link sent to the wrong number or left on a shared phone stops at once. The database
// gives the program a new /p token and its cards new /s tokens (new_program_link, 20261122160000); the
// page then shows the new QR code. The program itself never changes.
import type { Route } from "next";
import { redirect } from "next/navigation";
import * as z from "zod";

import { requireMember, requireSameClinic } from "@/app/lib/onboarding/session";

export async function newProgramLink(form: FormData): Promise<void> {
  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  requireSameClinic(form, profile); // the page was shown for another clinic: nothing changes
  const programId = z.uuid().safeParse(form.get("programId"));
  if (!programId.success) redirect("/");
  const note = z.uuid().safeParse(form.get("note"));
  const back = (link: string) => {
    const q = new URLSearchParams({ link });
    if (note.success) q.set("note", note.data);
    return `/programs/${programId.data}?${q}` as Route;
  };

  const { error } = await supabase.rpc("new_program_link", { p_clinic_id: profile.clinic_id, p_program_id: programId.data });
  if (error) {
    if (/other clinic/.test(error.message)) redirect("/?stale=1");
    console.error("new_program_link failed:", error.code, error.message);
    redirect(back("failed"));
  }
  redirect(back("new"));
}
