// «Νέα συνεδρία» step 2 of 4: same program or a new one? Only for a patient who already has an approved
// program (?patient=<id>, from step 1). No program yet, or an unknown patient: straight to the recording.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import * as z from "zod";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { readProgram } from "@/app/lib/notes/schema";
import { requireMember } from "@/app/lib/onboarding/session";

import { ProgramChoice } from "./ProgramChoice";

export const metadata: Metadata = { title: "Νέα συνεδρία · πρόγραμμα" };

export default async function ProgramStepPage({ searchParams }: PageProps<"/notes/program">) {
  const { profile, supabase } = await requireMember();
  const { patient: raw } = await searchParams;
  const id = z.uuid().safeParse(raw);
  if (!id.success) redirect("/notes/new");

  // RLS: only this clinic's patients and programs are visible.
  const [{ data: patient }, { data: last }, { data: lastNote }] = await Promise.all([
    supabase.from("patients").select("id, label").eq("id", id.data).is("archived_at", null).maybeSingle(),
    supabase
      .from("programs")
      .select("id, approved_at, program")
      .eq("patient_id", id.data)
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // The area the physio wrote in the last note, for «Προτεινόμενα» templates (physios only: RLS).
    supabase.from("notes").select("note").eq("patient_id", id.data).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const lastArea = (lastNote?.note as { body_area?: unknown } | undefined)?.body_area;
  if (!patient) redirect("/notes/new");
  const program = last ? readProgram(last.program) : null;
  if (!last || !program) redirect("/notes/record"); // nothing stored (or unreadable): a new program

  return (
    <StaffSheet profile={profile} current="new" step={{ n: 2, of: 4 }}>
      <ProgramChoice
        patient={{ id: patient.id as string, label: patient.label as string }}
        stored={{ programId: last.id as string, approvedAt: last.approved_at as string, program }}
        area={typeof lastArea === "string" && lastArea.trim() ? lastArea.trim() : null}
      />
    </StaffSheet>
  );
}
