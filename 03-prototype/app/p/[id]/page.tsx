// The patient's page: their approved program, nothing else (never the clinical note).
// Outside the (physio) group, so it has no physio header and no draft.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PatientProgramView } from "@/app/features/patient/PatientProgramView";
import { TEXT_SIZE_SCRIPT } from "@/app/features/patient/TextSize";
import { readPatientProgram } from "@/app/lib/programs";

export async function generateMetadata(props: PageProps<"/p/[id]">): Promise<Metadata> {
  const program = await readPatientProgram((await props.params).id);
  return { title: program?.title ?? "Πρόγραμμα ασκήσεων", robots: { index: false, follow: false } };
}

export default async function PatientPage(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const program = await readPatientProgram(id);
  if (!program) notFound();
  return (
    <>
      {/* Sets the saved text size before the page is drawn, so it doesn't jump after loading. */}
      <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      <PatientProgramView id={id} program={program} clinicName={process.env.CLINIC_NAME || undefined} />
    </>
  );
}
