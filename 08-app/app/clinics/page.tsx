// «Οι κλινικές σας»: every clinic the person belongs to, with their role there, and «Άνοιγμα» for
// the others. One clinic is open at a time: the room board, patients, notes and team are that one's.
// Reached from «Αλλαγή» next to the clinic's name in the top bar.
import type { Metadata } from "next";
import Link from "next/link";

import { PaperLink, QuietSubmit } from "@/app/components/paper/Buttons";
import { ConfirmSubmit } from "@/app/components/paper/ConfirmSubmit";
import { FormAlert } from "@/app/components/paper/Notes";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { leaveClinic, switchClinic } from "@/app/lib/clinics/actions";
import { InviteNotice } from "@/app/components/paper/InviteNotice";
import { loadMyClinics, loadMyInvites, requireMember, type MyClinic } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Οι κλινικές σας" };

const ROLE_THERE: Record<MyClinic["role"], string> = {
  owner: "Υπεύθυνη/ος",
  physio: "Φυσιοθεραπευτής",
  assistant: "Βοηθός",
};

export default async function ClinicsPage({ searchParams }: PageProps<"/clinics">) {
  const { supabase, profile } = await requireMember();
  const { switch: result, leave } = await searchParams;
  const [clinics, invites] = await Promise.all([loadMyClinics(supabase), loadMyInvites(supabase)]);

  return (
    <StaffSheet profile={profile}>
      <div className="flex max-w-[720px] flex-col gap-6">
        <Link href="/" className="min-h-11 content-center self-start">
          <span aria-hidden="true">←</span> Πίσω στην αρχική
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[32px] leading-[1.1] sm:text-[38px]">Οι κλινικές σας</h1>
          <p className="max-w-[60ch] text-muted">
            Κάθε κλινική έχει τους δικούς της ασθενείς, χώρους και ομάδα. Βλέπετε μία κάθε φορά: αυτή που είναι ανοιχτή.
          </p>
        </div>

        <InviteNotice invites={invites} lead="Σας περιμένουν προσκλήσεις" />

        {result === "failed" && <FormAlert>Δεν άνοιξε αυτή η κλινική. Δοκιμάστε ξανά σε λίγο.</FormAlert>}
        {leave === "last-owner" && (
          <FormAlert>
            Είστε η/ο μόνη/ος υπεύθυνη/ος αυτής της κλινικής. Ορίστε πρώτα κάποιον άλλον ως υπεύθυνο («Κλινική» → «Ομάδα»), και
            μετά αποχωρήστε.
          </FormAlert>
        )}
        {leave === "failed" && <FormAlert>Η αποχώρηση δεν έγινε. Δοκιμάστε ξανά σε λίγο.</FormAlert>}

        <ul className="flex flex-col gap-3">
          {clinics.map((clinic) => (
            <li
              key={clinic.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border-2 border-hairline bg-white px-4 py-3"
            >
              <span className="flex min-w-0 flex-[1_1_260px] flex-col">
                <span className="text-[19px] font-semibold">{clinic.name}</span>
                <span className="text-muted">
                  {clinic.city ? `${clinic.city} · ` : ""}
                  {ROLE_THERE[clinic.role]}
                </span>
              </span>
              {clinic.current ? (
                <span className="rounded-md bg-note-green px-3 py-1.5 font-semibold text-action">Ανοιχτή τώρα</span>
              ) : (
                <form action={switchClinic}>
                  <input type="hidden" name="clinicId" value={clinic.id} />
                  <QuietSubmit pending="Άνοιγμα…">
                    Άνοιγμα<span className="sr-only"> της κλινικής {clinic.name}</span>
                  </QuietSubmit>
                </form>
              )}
              <form action={leaveClinic} className="basis-full">
                <input type="hidden" name="clinicId" value={clinic.id} />
                <ConfirmSubmit question={`Να αποχωρήσετε από ${clinic.name};`} pending="Αποχώρηση…">
                  Αποχώρηση<span className="sr-only"> από την κλινική {clinic.name}</span>
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1.5">
          <PaperLink href="/clinics/new" variant="outline">
            <span aria-hidden="true">+</span> Νέα κλινική
          </PaperLink>
          <p className="text-muted">Για δεύτερο χώρο με δικούς του ασθενείς και δική του ομάδα. Θα είστε η/ο υπεύθυνη/ος.</p>
        </div>
      </div>
    </StaffSheet>
  );
}
