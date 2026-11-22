"use server";
// «Οι κλινικές σας»: open another of your clinics, or open a new one. Reachable by anyone who can send
// a POST, so each checks the login and every field itself; the real rules are in the database:
// switch_clinic() refuses a clinic you don't belong to (and the profile can't point at one without a
// membership); create_clinic() needs you in a clinic already, at most 10 as owner.
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/app/lib/onboarding/actions";
import { fieldErrors, NewClinicSchema } from "@/app/lib/onboarding/schema";
import { requireMember } from "@/app/lib/onboarding/session";

// «Δημιουργία κλινικής»: the clinic, and it opens right away. A clinic needs one room to start, so it
// gets «Αίθουσα» with 1 bed; the owner sets the real rooms from «Επόμενα βήματα» (the form doesn't ask).
const FIRST_ROOM_BEDS = 1;

export async function createClinic(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireMember();
  const values = Object.fromEntries(["clinicName", "city", "phone"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = NewClinicSchema.safeParse({ ...values, consent: form.get("consent") ?? undefined });
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values, message: "Κάτι λείπει. Δείτε τα μηνύματα με κόκκινο πιο κάτω." };
  }

  const { clinicName, city, phone } = parsed.data;
  const { error } = await supabase.rpc("create_clinic", {
    p_name: clinicName,
    p_city: city,
    p_phone: phone,
    p_beds: FIRST_ROOM_BEDS,
  });
  if (error) {
    if (error.message.includes("too many clinics")) {
      return { message: "Έχετε ήδη 10 κλινικές ως υπεύθυνη/ος, όσες επιτρέπονται. Για περισσότερες, γράψτε μας.", values };
    }
    console.error("create_clinic failed:", error.code, error.message);
    return { message: "Η κλινική δεν δημιουργήθηκε. Τα στοιχεία κρατήθηκαν: δοκιμάστε ξανά σε λίγο.", values };
  }
  redirect("/?saved=new-clinic");
}

export async function switchClinic(form: FormData): Promise<void> {
  const { supabase } = await requireMember();
  const id = z.uuid().safeParse(form.get("clinicId"));
  if (!id.success) redirect("/clinics?switch=failed");

  const { error } = await supabase.rpc("switch_clinic", { target: id.data });
  if (error) {
    if (!error.message.includes("not a member")) console.error("switch_clinic failed:", error.code, error.message);
    redirect("/clinics?switch=failed");
  }
  redirect("/?saved=clinic");
}

// «Αποχώρηση»: leave one of your clinics (leave_clinic, 20261122120000). Leaving the open one opens the
// next; leaving the last one goes back to sign-up. A clinic's last owner can't leave (make someone else
// owner first, in «Ομάδα»).
export async function leaveClinic(form: FormData): Promise<void> {
  const { supabase } = await requireMember();
  const id = z.uuid().safeParse(form.get("clinicId"));
  if (!id.success) redirect("/clinics?leave=failed");
  const { error } = await supabase.rpc("leave_clinic", { p_clinic: id.data });
  if (error) {
    if (error.message.includes("last owner")) redirect("/clinics?leave=last-owner");
    if (!error.message.includes("not a member")) console.error("leave_clinic failed:", error.message);
    redirect("/clinics?leave=failed");
  }
  redirect("/?saved=left");
}
