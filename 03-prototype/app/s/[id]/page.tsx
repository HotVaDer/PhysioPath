// The patient's session screen (opened from the QR code, or on a clinic tablet).
// Outside the (physio) group: no physio header, no draft, never the clinical note.
// The first screen is drawn on the server, so it shows up even before a slow phone runs any JavaScript.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { TEXT_SIZE_SCRIPT } from "@/app/features/patient/TextSize";
import { SessionScreen } from "@/app/features/session/SessionScreen";
import { patientView } from "@/app/lib/session";
import { getSession } from "@/app/lib/sessions";

export const metadata: Metadata = { title: "Η συνεδρία σας", robots: { index: false, follow: false } };

export default async function SessionPage(props: PageProps<"/s/[id]">) {
  await connection(); // live data: read it on every visit
  const session = getSession((await props.params).id);
  if (!session) notFound();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      <SessionScreen initial={patientView(session)} clinicName={process.env.CLINIC_NAME || undefined} />
    </>
  );
}
