// §3 of the registration form: who else works at the clinic, and in which role.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { progress } from "@/app/lib/onboarding/schema";
import { requireFormUser } from "@/app/lib/onboarding/session";
import { TeamForm } from "@/app/register/team/TeamForm";

export const metadata: Metadata = { title: "§3 Ομάδα" };

export default async function TeamPage() {
  const { draft, user } = await requireFormUser();
  const done = progress(draft);
  if (!done.clinic) redirect("/register/clinic");
  if (!done.rooms) redirect("/register/rooms");

  return (
    <Sheet tabs={<BinderTabs current="team" done={{ you: true, clinic: true, rooms: true }} />} page={{ n: 4, of: 5 }}>
      <div className="flex flex-col gap-5">
        <Link href="/register/rooms" className="self-start text-base">
          Πίσω
        </Link>
        <SectionHeading
          mark="§3"
          title="Η ομάδα σας"
          note="Κάθε συνεργάτης παίρνει το δικό του αντίγραφο με email, όταν υπογράψετε. Μπορείτε να το κάνετε και αργότερα."
        />
        <TeamForm initial={draft.team ?? []} ownerName={draft.ownerName ?? ""} ownEmail={user.email?.toLowerCase() ?? ""} />
      </div>
    </Sheet>
  );
}
