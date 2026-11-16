// Home. For now the clinic's details (and, right after sign-up, «Η κλινική σας είναι έτοιμη»), «Νέα σημείωση» for owner/physio and,
// for the owner, the team's invites (with «Ξανά αποστολή»). The room board moves here next (from 03-prototype, restyled in
// the paper look). Not signed in → registration; signed in but the form isn't filed → the form.
import type { Metadata } from "next";

import { PaperLink, QuietSubmit } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { SignOut } from "@/app/components/paper/SignOut";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { resendInvite } from "@/app/lib/onboarding/actions";
import { ROLES, type Role } from "@/app/lib/onboarding/schema";
import { requireMember } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Η αίθουσα" };

type Invite = { id: string; email: string; role: Role; expires_at: string; accepted_at: string | null };

function inviteStatus(invite: Invite): { text: string; canResend: boolean } {
  if (invite.accepted_at) return { text: "μπήκε στην ομάδα ✓", canResend: false };
  if (new Date(invite.expires_at) < new Date()) return { text: "η πρόσκληση έληξε", canResend: true };
  return { text: "περιμένουμε να την αποδεχτεί", canResend: true };
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { supabase, profile } = await requireMember();
  const { invite: inviteResult, to, at, welcome } = await searchParams;
  const sentTo = typeof to === "string" && to.length <= 254 ? to : null;
  const sentAt = typeof at === "string" && /^\d{1,2}:\d{2}$/.test(at) ? at : null;
  const isOwner = profile.role === "owner";
  const [{ data: clinic }, { data: rooms }, { data: invites }] = await Promise.all([
    supabase.from("clinics").select("name, city, phone").eq("id", profile.clinic_id).maybeSingle(),
    supabase.from("rooms").select("name, beds, stations").order("position"),
    isOwner
      ? supabase.from("invites").select("id, email, role, expires_at, accepted_at").order("created_at")
      : Promise.resolve({ data: [] as Invite[] }),
  ]);
  const roleLabel = profile.role === "owner" ? "Υπεύθυνη/ος κλινικής" : ROLES[profile.role];
  const canSend = Boolean(process.env.SUPABASE_SECRET_KEY);

  return (
    <StaffSheet profile={profile} current="board" title={<span className="font-typed">{clinic?.name}</span>}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[36px] leading-[1.08] sm:text-[42px]">Η αίθουσα</h1>
          <p>
            Καλώς ήρθατε, {profile.full_name}. <span className="text-muted">({roleLabel})</span>
          </p>
        </div>

        {welcome === "1" && (
          <p role="status" className="bg-note-green px-4 py-3">
            <span className="font-semibold">Η εγγραφή ολοκληρώθηκε. Η κλινική σας είναι έτοιμη.</span> Από εδώ ξεκινάτε κάθε
            νέα σημείωση.
          </p>
        )}

        {profile.role !== "assistant" && (
          <PaperLink href="/notes/new">
            <span aria-hidden="true">+</span> Νέα σημείωση
          </PaperLink>
        )}

        <dl className="flex flex-col border-b border-ledger">
          <div className="flex flex-wrap gap-x-4 border-t border-ledger py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Κλινική</dt>
            <dd className="font-typed text-[19px]">
              {clinic?.name}
              {clinic?.city ? `, ${clinic.city}` : ""}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 border-t border-ledger py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Τηλέφωνο</dt>
            <dd className="font-typed text-[19px]">{clinic?.phone}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 border-t border-ledger py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Χώροι</dt>
            <dd className="font-typed text-[19px]">
              {(rooms ?? []).map((r) => (
                <span key={r.name} className="block">
                  {r.name} · {r.beds} κρεβ. · {r.stations} θέσ.
                </span>
              ))}
            </dd>
          </div>
        </dl>

        {isOwner && (
          <section aria-labelledby="team" className="flex flex-col gap-3">
            <h2 id="team" className="font-display text-[26px]">
              Ομάδα
            </h2>
            {inviteResult === "sent" && (
              <p role="status" className="bg-note-green px-4 py-3">
                <span className="font-semibold">
                  Η πρόσκληση στάλθηκε ξανά{sentTo ? " στο " : ""}
                  {sentTo && <span className="break-all font-typed">{sentTo}</span>}
                  {sentAt ? ` στις ${sentAt}` : ""}.
                </span>{" "}
                Ισχύει για 7 μέρες. Αν δεν φαίνεται, να κοιτάξει στα ανεπιθύμητα.
              </p>
            )}
            {inviteResult === "not-sent" && (
              <FormAlert>
                Η πρόσκληση{sentTo ? ` στο ${sentTo}` : ""} δεν στάλθηκε. Δοκιμάστε ξανά σε λίγο.
              </FormAlert>
            )}
            {!canSend && process.env.NODE_ENV === "development" && (
              <p className="bg-tab-yellow px-4 py-3 text-base">
                Για προγραμματιστές: τα email πρόσκλησης χρειάζονται το <span className="font-typed">SUPABASE_SECRET_KEY</span> στο{" "}
                <span className="font-typed">.env.local</span>.
              </p>
            )}
            {(invites ?? []).length === 0 ? (
              <p className="text-muted">Δεν έχετε καλέσει κανέναν ακόμα.</p>
            ) : (
              <ul className="flex flex-col border-b border-ledger">
                {(invites as Invite[]).map((invite) => {
                  const status = inviteStatus(invite);
                  return (
                    <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ledger py-3">
                      <span className="flex-[1_1_240px] break-all font-typed">{invite.email}</span>
                      <span className="text-base">{ROLES[invite.role]}</span>
                      <span className="text-base text-muted">{status.text}</span>
                      {status.canResend && (
                        <form action={resendInvite}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <QuietSubmit pending="Αποστολή…">
                            Ξανά αποστολή<span className="sr-only"> στο {invite.email}</span>
                          </QuietSubmit>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <SignOut />
      </div>
    </StaffSheet>
  );
}
