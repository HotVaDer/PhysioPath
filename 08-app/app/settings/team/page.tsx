// Ρυθμίσεις → Ομάδα (owner only): invite someone, and the list of everyone invited, with what
// happened to each invite, «Ξανά αποστολή» and «Ακύρωση». (The list used to be on the home page.)
import type { Metadata } from "next";
import Link from "next/link";

import { QuietSubmit } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { resendInvite } from "@/app/lib/onboarding/actions";
import { ROLES, type Role } from "@/app/lib/onboarding/schema";
import { requireOwner } from "@/app/lib/onboarding/session";
import { cancelInvite } from "@/app/lib/settings/actions";
import { InviteForm } from "@/app/settings/team/InviteForm";

export const metadata: Metadata = { title: "Η ομάδα σας" };

type Invite = { id: string; email: string; role: Role; expires_at: string; accepted_at: string | null };

function inviteStatus(invite: Invite): { text: string; open: boolean } {
  if (invite.accepted_at) return { text: "Μπήκε στην ομάδα ✓", open: false };
  if (new Date(invite.expires_at) < new Date()) return { text: "Η πρόσκληση έληξε", open: true };
  return { text: "Δεν την αποδέχτηκε ακόμα", open: true };
}

export default async function TeamSettingsPage({ searchParams }: PageProps<"/settings/team">) {
  const { supabase, profile } = await requireOwner();
  const { invite: result, to, at } = await searchParams;
  const sentTo = typeof to === "string" && to.length <= 254 ? to : null;
  const sentAt = typeof at === "string" && /^\d{1,2}:\d{2}$/.test(at) ? at : null;
  const { data } = await supabase.from("invites").select("id, email, role, expires_at, accepted_at").order("created_at");
  const invites = (data ?? []) as Invite[];
  const canSend = Boolean(process.env.SUPABASE_SECRET_KEY);
  const email = sentTo && <span className="break-all font-typed">{sentTo}</span>;

  return (
    <StaffSheet profile={profile}>
      <div className="flex max-w-[720px] flex-col gap-6">
        <Link href="/" className="min-h-11 content-center self-start">
          <span aria-hidden="true">←</span> Πίσω στην αρχική
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[32px] leading-[1.1] sm:text-[38px]">Η ομάδα σας</h1>
          <p className="max-w-[60ch] text-muted">Καλέστε τους συνεργάτες σας, έναν έναν. Ο καθένας μπαίνει με το δικό του email.</p>
        </div>

        {(result === "new" || result === "sent") && (
          <p role="status" className="bg-note-green px-4 py-3">
            <span className="font-semibold">
              {result === "new" ? "Στείλαμε την πρόσκληση" : "Στείλαμε ξανά την πρόσκληση"}
              {sentTo ? " στο " : ""}
              {email}
              {sentAt ? ` στις ${sentAt}` : ""}.
            </span>{" "}
            Ισχύει για 7 μέρες. Αν δεν τη βρει, να κοιτάξει και στα «Ανεπιθύμητα».
          </p>
        )}
        {result === "cancelled" && (
          <p role="status" className="bg-note-green px-4 py-3 font-semibold">
            Η πρόσκληση{sentTo ? " στο " : ""}
            {email} ακυρώθηκε.
          </p>
        )}
        {result === "not-sent" && (
          <FormAlert>
            Η πρόσκληση{sentTo ? ` στο ${sentTo}` : ""} δεν στάλθηκε. Πατήστε «Ξανά αποστολή» στη λίστα σε λίγο.
          </FormAlert>
        )}
        {!canSend && process.env.NODE_ENV === "development" && (
          <p className="bg-tab-yellow px-4 py-3 text-base">
            Για προγραμματιστές: τα email πρόσκλησης χρειάζονται το <span className="font-typed">SUPABASE_SECRET_KEY</span> στο{" "}
            <span className="font-typed">.env.local</span>.
          </p>
        )}

        <section aria-labelledby="invite" className="flex flex-col gap-3 rounded-md border-2 border-hairline px-4 pb-5 pt-4 sm:px-6">
          <h2 id="invite" className="font-display text-[24px]">
            Καλέστε κάποιον
          </h2>
          {/* A new key after each send: the form starts empty, without the last error. */}
          <InviteForm key={`${result}${sentTo}${sentAt}`} clinicId={profile.clinic_id} />
        </section>

        <section aria-labelledby="list" className="flex flex-col gap-2">
          <h2 id="list" className="font-display text-[24px]">
            Ποιοι είναι στην ομάδα
          </h2>
          <ul className="flex flex-col border-b border-hairline">
            <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline py-3">
              <span className="flex-[1_1_240px] font-semibold">{profile.full_name} (εσείς)</span>
              <span>Υπεύθυνη/ος κλινικής</span>
            </li>
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              return (
                <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline py-3">
                  <span className="flex-[1_1_240px] break-all font-typed">{invite.email}</span>
                  <span>{ROLES[invite.role]}</span>
                  <span className="text-muted">{status.text}</span>
                  {status.open && (
                    <span className="flex flex-wrap gap-x-4">
                      <form action={resendInvite}>
                        <input type="hidden" name="clinicId" value={profile.clinic_id} />
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <QuietSubmit pending="Αποστολή…">
                          Ξανά αποστολή<span className="sr-only"> στο {invite.email}</span>
                        </QuietSubmit>
                      </form>
                      <form action={cancelInvite}>
                        <input type="hidden" name="clinicId" value={profile.clinic_id} />
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <QuietSubmit pending="Ακύρωση…">
                          Ακύρωση<span className="sr-only"> της πρόσκλησης στο {invite.email}</span>
                        </QuietSubmit>
                      </form>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {invites.length === 0 && <p className="text-muted">Δεν έχετε καλέσει κανέναν ακόμα.</p>}
        </section>
      </div>
    </StaffSheet>
  );
}
