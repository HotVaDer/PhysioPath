// End of a session: reads the saved home program on the server, so the page only exists for real ones.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApprovedScreen } from "@/app/features/approved/ApprovedScreen";
import { readPatientProgram } from "@/app/lib/programs";

export const metadata: Metadata = { title: "Τέλος συνεδρίας" };

export default async function ApprovedPage(props: PageProps<"/approved/[id]">) {
  const { id } = await props.params;
  const program = await readPatientProgram(id);
  if (!program) notFound();
  return <ApprovedScreen id={id} title={program.title} patientName={program.patient_first_name} exerciseCount={program.exercises.length} />;
}
