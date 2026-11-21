"use server";
// «Έγκριση» on the review sheet. Anyone can send a POST, so this checks who is signed in (owner or
// physio) and every field again, then calls approve_program() (new program + GeSY note + the card on
// the board) or, for «Ίδιο πρόγραμμα», continue_program() (today's note + the card, with the stored
// program). Each is one transaction. Nothing reaches the patient before this.
import { redirect } from "next/navigation";

import { Approval, approvalErrors, cleanProgram, OTHER_CLINIC_NOTE, parseWhere, type ApprovalErrors } from "@/app/lib/notes/approval";
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
  // Started in another clinic (opened since, maybe in another tab): its patient, program and beds are
  // that clinic's. Nothing is saved; the draft stays in this tab for when that clinic is open again.
  if (a.clinicId !== profile.clinic_id) return { message: OTHER_CLINIC_NOTE };
  const errors = approvalErrors(a);
  if (Object.keys(errors).length > 0) return { errors };

  const where = parseWhere(a.where);
  const place = where === "home" || !where ? null : where;
  const same = a.mode === "same";
  if (same && (!a.baseProgramId || !a.patient.id)) {
    return { message: "Δεν βρέθηκε το πρόγραμμα του ασθενή. Διαλέξτε ξανά «Ίδιο πρόγραμμα»." };
  }
  const { data, error } = same
    ? await supabase.rpc("continue_program", {
        p_draft_id: a.draftId,
        p_program_id: a.baseProgramId,
        p_note: a.note,
        p_note_lang: a.noteLang,
        p_activity_code: a.activityCode,
        p_room_id: place?.roomId ?? null,
        p_slot: place?.slot ?? null,
      })
    : await supabase.rpc("approve_program", {
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
    if (/program not found/.test(error.message)) {
      return { message: "Δεν βρέθηκε το πρόγραμμα του ασθενή. Διαλέξτε ξανά «Ίδιο πρόγραμμα»." };
    }
    if (/patient not found/.test(error.message)) {
      return { errors: { patient: "Ο ασθενής δεν βρέθηκε (ίσως αρχειοθετήθηκε). Διαλέξτε άλλον ή γράψτε νέο." } };
    }
    if (/not allowed/.test(error.message)) redirect("/");
    console.error(same ? "continue_program failed:" : "approve_program failed:", error.code, error.message);
    return { message: "Η έγκριση δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο." };
  }

  const saved = data as { programId?: string; noteId?: string } | null;
  if (!saved?.programId) return { message: "Η έγκριση δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο." };
  // ?note: this visit (one program can have many visits: «Ίδιο πρόγραμμα»). ?approved=1: just approved,
  // so the page clears the draft (opening the same page from the board must not).
  const query = new URLSearchParams({ approved: "1" });
  if (saved.noteId) query.set("note", saved.noteId);
  redirect(`/programs/${saved.programId}?${query}`);
}
