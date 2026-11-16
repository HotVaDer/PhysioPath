// «Νέα σημείωση»: who the note is for, the recording (or a sample), and the text we heard.
// Canvas: board PRNew. The recording and the draft live in the browser (NewNoteForm).
import type { Metadata } from "next";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { SAMPLES } from "@/app/lib/notes/samples";
import { requireMember } from "@/app/lib/onboarding/session";

import { NewNoteForm } from "./NewNoteForm";

export const metadata: Metadata = { title: "Νέα σημείωση" };

const today = () => new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

export default async function NewNotePage() {
  const { supabase, profile } = await requireMember();
  // Patients in treatment, newest first (archived ones stay out of the list).
  const { data: patients } = await supabase
    .from("patients")
    .select("id, label")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <StaffSheet profile={profile} current="new" title={`ΦΩΝΗΤΙΚΗ ΣΗΜΕΙΩΣΗ · ${today()}`} page={{ n: 1, of: 2 }}>
      <NewNoteForm patients={patients ?? []} samples={SAMPLES} />
    </StaffSheet>
  );
}
