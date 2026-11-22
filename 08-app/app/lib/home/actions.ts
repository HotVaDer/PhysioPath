"use server";
// «Το είδα» on a patient's page (owner or physio): the patient's pain reports of 7 or more are marked as
// seen, so the pink tag leaves «Ασθενείς» and the board. The database checks role and clinic
// (see_home_pain, 20261123120000); a new high pain later brings the tag back.
import type { Route } from "next";
import { redirect } from "next/navigation";
import * as z from "zod";

import { requireMember, requireSameClinic } from "@/app/lib/onboarding/session";

export async function seeHomePain(form: FormData): Promise<void> {
  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  requireSameClinic(form, profile); // the page was shown for another clinic: nothing changes
  const patientId = z.uuid().safeParse(form.get("patientId"));
  if (!patientId.success) redirect("/patients");
  const back = (seen: string) => `/patients/${patientId.data}?seen=${seen}` as Route;

  const { error } = await supabase.rpc("see_home_pain", { p_clinic_id: profile.clinic_id, p_patient_id: patientId.data });
  if (error) {
    if (/other clinic/.test(error.message)) redirect("/?stale=1");
    console.error("see_home_pain failed:", error.code, error.message);
    redirect(back("failed"));
  }
  redirect(back("1"));
}
