// §1 of the registration form: the clinic's name, city and the phone patients call.
import type { Metadata } from "next";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { SignOut } from "@/app/components/paper/SignOut";
import { progress } from "@/app/lib/onboarding/schema";
import { requireFormUser } from "@/app/lib/onboarding/session";
import { ClinicForm } from "@/app/register/clinic/ClinicForm";

export const metadata: Metadata = { title: "§1 Στοιχεία κλινικής" };

export default async function ClinicPage() {
  const { draft } = await requireFormUser();
  const done = progress(draft);

  return (
    <Sheet
      tabs={<BinderTabs current="clinic" done={{ you: true, rooms: done.rooms, team: done.team }} />}
      page={{ n: 2, of: 5 }}
    >
      <div className="flex flex-col gap-6">
        <SectionHeading mark="§1" title="Στοιχεία κλινικής" note="Αυτά τα βλέπουν οι ασθενείς στο πρόγραμμά τους." />
        <ClinicForm initial={draft} />
      </div>
      <SignOut lead="Λάθος λογαριασμός;" />
    </Sheet>
  );
}
