// Sign-up, step 3: the clinic. Pressing «Ολοκλήρωση εγγραφής» creates the clinic and goes home.
import type { Metadata } from "next";

import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { InviteNotice } from "@/app/components/paper/InviteNotice";
import { loadMyInvites, requireFormUser } from "@/app/lib/onboarding/session";
import { ClinicForm } from "@/app/register/clinic/ClinicForm";

export const metadata: Metadata = { title: "Η κλινική σας" };

export default async function ClinicPage() {
  const { supabase, draft } = await requireFormUser();
  // Someone invited to a clinic who lands here (their invite link expired, or they signed in without it):
  // show the invite first, so they join that clinic instead of creating an empty one of their own.
  const invites = await loadMyInvites(supabase);
  const beds = draft.rooms?.reduce((sum, r) => sum + r.beds, 0);

  return (
    <Sheet step={{ n: 3, of: 3 }} wide>
      <div className="flex flex-col gap-4">
        <InviteNotice
          invites={invites}
          lead="Σας έχουν προσκαλέσει σε κλινική. Για να μπείτε στην ομάδα της, δείτε την πρόσκληση: δεν χρειάζεται να φτιάξετε δική σας."
        />
        <SectionHeading title="Η κλινική σας" />
        <ClinicForm initial={{ ...draft, beds: beds || undefined }} />
      </div>
    </Sheet>
  );
}
