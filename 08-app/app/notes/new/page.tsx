// «Νέα συνεδρία», step 1 of 4: for which patient (then 2 same program or new, 3 the recording, 4 check and approve).
import type { Metadata } from "next";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { requireMember } from "@/app/lib/onboarding/session";

import { PatientForm } from "./PatientForm";

export const metadata: Metadata = { title: "Νέα συνεδρία · ασθενής" };

export default async function NewNotePage() {
  const { supabase, profile } = await requireMember();
  // Patients in treatment, newest first (archived ones stay out of the list).
  const { data: patients } = await supabase
    .from("patients")
    .select("id, label")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <StaffSheet profile={profile} current="new" step={{ n: 1, of: 4 }}>
      <PatientForm patients={patients ?? []} />
    </StaffSheet>
  );
}
