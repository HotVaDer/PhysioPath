// §2 of the registration form: rooms, beds and exercise stations (the room board's layout).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { progress } from "@/app/lib/onboarding/schema";
import { requireFormUser } from "@/app/lib/onboarding/session";
import { RoomsForm } from "@/app/register/rooms/RoomsForm";

export const metadata: Metadata = { title: "§2 Χώροι" };

export default async function RoomsPage() {
  const { draft } = await requireFormUser();
  const done = progress(draft);
  if (!done.clinic) redirect("/register/clinic");

  return (
    <Sheet tabs={<BinderTabs current="rooms" done={{ you: true, clinic: true, team: done.team }} />} page={{ n: 3, of: 5 }}>
      <div className="flex flex-col gap-5">
        <Link href="/register/clinic" className="self-start text-base">
          Πίσω
        </Link>
        <SectionHeading
          mark="§2"
          title="Χώροι, κρεβάτια, θέσεις"
          note="Μία γραμμή για κάθε χώρο. Ο πίνακας της αίθουσας θα έχει μία υποδοχή για κάθε κρεβάτι και θέση."
        />
        <RoomsForm initial={draft.rooms ?? []} />
      </div>
    </Sheet>
  );
}
