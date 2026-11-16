// Ρυθμίσεις → Χώροι (owner only). Sign-up made one room («Αίθουσα» with all the beds); here the
// owner names the rooms, splits the beds and adds exercise stations. The room board shows them.
import type { Metadata } from "next";
import Link from "next/link";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { requireOwner } from "@/app/lib/onboarding/session";
import { RoomsForm } from "@/app/settings/rooms/RoomsForm";

export const metadata: Metadata = { title: "Οι χώροι σας" };

export default async function RoomsSettingsPage() {
  const { supabase, profile } = await requireOwner();
  const { data: rooms } = await supabase.from("rooms").select("id, name, beds, stations").order("position");

  return (
    <StaffSheet profile={profile} title="Ρυθμίσεις">
      <div className="flex max-w-[720px] flex-col gap-5">
        <Link href="/" className="min-h-11 content-center self-start">
          <span aria-hidden="true">←</span> Πίσω στην αρχική
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[32px] leading-[1.1] sm:text-[38px]">Οι χώροι σας</h1>
          <p className="max-w-[60ch] text-muted">
            Ένα κουτί για κάθε χώρο της κλινικής, με τα κρεβάτια του. «Θέσεις άσκησης» είναι μέρη χωρίς κρεβάτι, για
            παράδειγμα ένα ποδήλατο ή ένα μονόζυγο. Οι αλλαγές γίνονται όταν πατήσετε «Αποθήκευση».
          </p>
        </div>
        <RoomsForm initial={rooms ?? []} />
      </div>
    </StaffSheet>
  );
}
