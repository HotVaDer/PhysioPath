// Sign-up, step 3: the clinic. Pressing «Ολοκλήρωση εγγραφής» creates the clinic and goes home.
import type { Metadata } from "next";

import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { requireFormUser } from "@/app/lib/onboarding/session";
import { ClinicForm } from "@/app/register/clinic/ClinicForm";

export const metadata: Metadata = { title: "Η κλινική σας" };

export default async function ClinicPage() {
  const { draft } = await requireFormUser();
  const beds = draft.rooms?.reduce((sum, r) => sum + r.beds, 0);

  return (
    <Sheet step={{ n: 3, of: 3 }} wide>
      <div className="flex flex-col gap-4">
        <SectionHeading title="Η κλινική σας" />
        <ClinicForm initial={{ ...draft, beds: beds || undefined }} />
      </div>
    </Sheet>
  );
}
