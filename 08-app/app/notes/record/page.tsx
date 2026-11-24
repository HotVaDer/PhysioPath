// «Νέα συνεδρία», step 3 of 4: the recording (or a file, or a sample) and the text we heard.
// The patient was chosen in step 1 (/notes/new); without one, RecordForm sends the physio back there.
import type { Metadata } from "next";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { SAMPLES } from "@/app/lib/notes/samples";
import { requireMember } from "@/app/lib/onboarding/session";

import { RecordForm } from "./RecordForm";

export const metadata: Metadata = { title: "Νέα συνεδρία · ηχογράφηση" };

export default async function RecordPage() {
  const { profile } = await requireMember();
  return (
    <StaffSheet profile={profile} current="new" step={{ n: 3, of: 4 }}>
      {/* A demo clinic: what is left of its recordings (the yellow strip on top shows the numbers). */}
      <RecordForm samples={SAMPLES} demoLeft={profile.demo?.left ?? null} />
    </StaffSheet>
  );
}
