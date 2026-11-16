// «Έλεγχος και έγκριση»: the program, the GeSY note, the questions, and where the patient exercises.
// Canvas: board PRReview. The draft itself is in the browser (ReviewForm); the server adds what only
// the database knows: the rooms and which beds are taken now, and each patient's earlier notes
// (for «Συνεδρία N»).
import type { Metadata } from "next";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { slotOptions, type OpenSession, type Room } from "@/app/lib/notes/approval";
import { requireMember } from "@/app/lib/onboarding/session";

import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "Έλεγχος και έγκριση" };

export default async function ReviewPage() {
  const { supabase, profile } = await requireMember();
  // Cards older than 12 hours don't hold a bed (approve_program frees them).
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const [{ data: rooms }, { data: open }, { data: patients }, { data: notes }] = await Promise.all([
    supabase.from("rooms").select("id, name, beds, stations").order("position"),
    supabase.from("sessions").select("room_id, slot, patient_id").is("finished_at", null).gt("created_at", since),
    supabase.from("patients").select("id, label"),
    supabase.from("notes").select("patient_id"),
  ]);

  const labels = new Map((patients ?? []).map((p) => [p.id as string, p.label as string]));
  const openSessions: OpenSession[] = (open ?? []).map((s) => ({
    room_id: s.room_id,
    slot: s.slot,
    patient_label: s.patient_id ? (labels.get(s.patient_id) ?? null) : null,
  }));
  const notesPerPatient: Record<string, number> = {};
  for (const n of notes ?? []) if (n.patient_id) notesPerPatient[n.patient_id] = (notesPerPatient[n.patient_id] ?? 0) + 1;

  const today = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  return (
    <StaffSheet profile={profile} current="new" title="ΣΗΜΕΙΩΣΗ ΣΥΝΕΔΡΙΑΣ · ΠΡΟΣ ΕΓΚΡΙΣΗ" page={{ n: 2, of: 2 }}>
      <ReviewForm
        slots={slotOptions((rooms ?? []) as Room[], openSessions)}
        notesPerPatient={notesPerPatient}
        signer={profile.full_name ?? ""}
        today={today}
      />
    </StaffSheet>
  );
}
