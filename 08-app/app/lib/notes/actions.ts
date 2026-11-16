"use server";
// «Έγκριση» on the review sheet. Anyone can send a POST, so this checks who is signed in (owner or
// physio) and every field again, then calls approve_program(): program + GeSY note + the card on the
// board in one transaction. Nothing reaches the patient before this.
import { redirect } from "next/navigation";

import { Approval, approvalErrors, cleanProgram, parseWhere, type ApprovalErrors } from "@/app/lib/notes/approval";
import { requireMember } from "@/app/lib/onboarding/session";

export type ApproveState = {
  errors?: ApprovalErrors;
  message?: string;
  // The bed was taken a moment ago by someone else: the page reloads the free slots.
  slotTaken?: boolean;
  at?: number;
};

export async function approveNote(_: ApproveState, form: FormData): Promise<ApproveState> {
  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return { message: "Η σελίδα δεν έστειλε σωστά τα στοιχεία. Ανανεώστε τη σελίδα και δοκιμάστε ξανά." };
  }
  const parsed = Approval.safeParse(raw);
  if (!parsed.success) return { message: "Κάποιο πεδίο δεν διαβάστηκε. Ελέγξτε τη σημείωση και δοκιμάστε ξανά." };
  const a = parsed.data;
  const errors = approvalErrors(a);
  if (Object.keys(errors).length > 0) return { errors };

  const where = parseWhere(a.where);
  const place = where === "home" || !where ? null : where;
  const { data, error } = await supabase.rpc("approve_program", {
    p_draft_id: a.draftId,
    p_patient_id: a.patient.id,
    p_patient_label: a.patient.id ? null : a.patient.label.trim(),
    p_program: cleanProgram(a.program),
    p_note: a.note,
    p_note_lang: a.noteLang,
    p_activity_code: a.activityCode,
    p_room_id: place?.roomId ?? null,
    p_slot: place?.slot ?? null,
  });

  if (error) {
    // 23505 = the bed already has an open session (sessions_open_slot); the others = the room changed.
    if (error.code === "23505" || /no such slot|room not in this clinic/.test(error.message)) {
      return { slotTaken: true, at: Date.now(), errors: { where: "Αυτή η θέση πιάστηκε μόλις τώρα. Διαλέξτε άλλη." } };
    }
    if (/patient not found/.test(error.message)) {
      return { errors: { patient: "Ο ασθενής δεν βρέθηκε (ίσως αρχειοθετήθηκε). Διαλέξτε άλλον ή γράψτε νέο." } };
    }
    if (/not allowed/.test(error.message)) redirect("/");
    console.error("approve_program failed:", error.code, error.message);
    return { message: "Η έγκριση δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο." };
  }

  const programId = (data as { programId?: string } | null)?.programId;
  if (!programId) return { message: "Η έγκριση δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο." };
  redirect(`/programs/${programId}`);
}
