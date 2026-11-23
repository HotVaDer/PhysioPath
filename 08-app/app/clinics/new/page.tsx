// «Νέα κλινική»: someone already in a clinic opens another one and becomes its owner. The same form as
// sign-up's clinic step; afterwards the new clinic is open, with its own «Επόμενα βήματα» (rooms, team).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { requireMember } from "@/app/lib/onboarding/session";
import { ClinicForm } from "@/app/register/clinic/ClinicForm";

export const metadata: Metadata = { title: "Νέα κλινική" };

export default async function NewClinicPage() {
  const { profile } = await requireMember();
  if (profile.demo) redirect("/clinics"); // no real clinic from inside a demo

  return (
    <StaffSheet profile={profile}>
      <div className="flex flex-col gap-6">
        <Link href="/clinics" className="min-h-11 content-center self-start">
          <span aria-hidden="true">←</span> Πίσω στις κλινικές σας
        </Link>
        <div className="flex max-w-[720px] flex-col gap-1.5">
          <h1 className="font-display text-[32px] leading-[1.1] sm:text-[38px]">Νέα κλινική</h1>
          <p className="max-w-[60ch] text-muted">
            Η νέα κλινική έχει δικούς της ασθενείς, χώρους και ομάδα, και εσείς είστε η/ο υπεύθυνη/ος.
            {profile.clinic_name ? ` Η «${profile.clinic_name}» μένει όπως είναι.` : ""} Τους χώρους και τα κρεβάτια
            τα ρυθμίζετε μετά, από την αρχική της νέας κλινικής.
          </p>
        </div>
        <ClinicForm initial={{}} mode="new" />
      </div>
    </StaffSheet>
  );
}
