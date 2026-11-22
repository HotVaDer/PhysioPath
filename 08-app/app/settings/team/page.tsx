// Ρυθμίσεις → Ομάδα (owner only): invite someone; who is in the team, with their role (changeable) and
// «Αφαίρεση»; and the invites still waiting, with «Ξανά αποστολή» and «Ακύρωση».
import type { Metadata } from "next";
import Link from "next/link";

import { AutoRefresh } from "@/app/components/paper/AutoRefresh";
import { QuietSubmit } from "@/app/components/paper/Buttons";
import { ConfirmSubmit } from "@/app/components/paper/ConfirmSubmit";
import { FormAlert } from "@/app/components/paper/Notes";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { resendInvite } from "@/app/lib/onboarding/actions";
import { ROLES, type Role } from "@/app/lib/onboarding/schema";
import { loadClinicMembers, requireOwner, type ClinicMember } from "@/app/lib/onboarding/session";
import { cancelInvite, changeRole, removeMember } from "@/app/lib/settings/actions";
import { InviteForm } from "@/app/settings/team/InviteForm";

export const metadata: Metadata = { title: "Η ομάδα σας" };

type Invite = { id: string; email: string; role: Role; expires_at: string; accepted_at: string | null };

function inviteStatus(invite: Invite): string {
  return new Date(invite.expires_at) < new Date() ? "Η πρόσκληση έληξε" : "Δεν την αποδέχτηκε ακόμα";
}

const ROLE_IN_TEAM: Record<ClinicMember["role"], string> = { owner: "Υπεύθυνη/ος", physio: "Φυσιοθεραπευτής", assistant: "Βοηθός" };

// What happened after a press on a member (?member=…).
const MEMBER_NOTE: Record<string, { text: string; ok: boolean }> = {
  removed: { text: "Το άτομο βγήκε από την ομάδα. Δεν βλέπει πια τίποτα από την κλινική. Μπορείτε να το καλέσετε ξανά.", ok: true },
  role: { text: "Ο ρόλος άλλαξε.", ok: true },
  gone: { text: "Αυτό το άτομο δεν είναι πια στην ομάδα.", ok: true },
  "last-owner": { text: "Η κλινική χρειάζεται τουλάχιστον μία/έναν υπεύθυνη/ο. Ορίστε πρώτα κάποιον άλλον ως υπεύθυνο.", ok: false },
  failed: { text: "Η αλλαγή δεν έγινε. Δοκιμάστε ξανά σε λίγο.", ok: false },
};

export default async function TeamSettingsPage({ searchParams }: PageProps<"/settings/team">) {
  const { supabase, profile } = await requireOwner();
  const { invite: result, to, at, member } = await searchParams;
  const sentTo = typeof to === "string" && to.length <= 254 ? to : null;
  const sentAt = typeof at === "string" && /^\d{1,2}:\d{2}$/.test(at) ? at : null;
  const [{ data }, members] = await Promise.all([
    supabase.from("invites").select("id, email, role, expires_at, accepted_at").is("accepted_at", null).order("created_at"),
    loadClinicMembers(supabase, profile.clinic_id),
  ]);
  const invites = (data ?? []) as Invite[];
  const memberNote = typeof member === "string" ? MEMBER_NOTE[member] : undefined;
  const canSend = Boolean(process.env.SUPABASE_SECRET_KEY);
  const email = sentTo && <span className="break-all font-typed">{sentTo}</span>;

  return (
    <StaffSheet profile={profile}>
      <AutoRefresh />
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
        {memberNote &&
          (memberNote.ok ? (
            <p role="status" className="bg-note-green px-4 py-3 font-semibold">
              {memberNote.text}
            </p>
          ) : (
            <FormAlert>{memberNote.text}</FormAlert>
          ))}
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
            {members.map((m) => {
              const name = m.name?.trim() || m.email || "Χωρίς όνομα";
              return (
                <li key={m.userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline py-3">
                  <span className="flex min-w-0 flex-[1_1_240px] flex-col">
                    <span className="font-semibold">
                      {name}
                      {m.me ? " (εσείς)" : ""}
                    </span>
                    {m.email && m.name && <span className="break-all text-base text-muted">{m.email}</span>}
                  </span>
                  {/* The role: change it and press «Αλλαγή». */}
                  <form action={changeRole} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="clinicId" value={profile.clinic_id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <label className="sr-only" htmlFor={`role-${m.userId}`}>
                      Ρόλος για {name}
                    </label>
                    <select
                      id={`role-${m.userId}`}
                      name="role"
                      defaultValue={m.role}
                      className="min-h-11 border-2 border-line bg-white px-2 text-base"
                    >
                      {(Object.keys(ROLE_IN_TEAM) as ClinicMember["role"][]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_IN_TEAM[r]}
                        </option>
                      ))}
                    </select>
                    <QuietSubmit pending="Αλλαγή…">
                      Αλλαγή<span className="sr-only"> ρόλου για {name}</span>
                    </QuietSubmit>
                  </form>
                  {!m.me && (
                    <form action={removeMember}>
                      <input type="hidden" name="clinicId" value={profile.clinic_id} />
                      <input type="hidden" name="userId" value={m.userId} />
                      <ConfirmSubmit question={`Να βγει ${name} από την ομάδα;`} pending="Αφαίρεση…">
                        Αφαίρεση<span className="sr-only"> του/της {name} από την ομάδα</span>
                      </ConfirmSubmit>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="waiting" className="flex flex-col gap-2">
          <h2 id="waiting" className="font-display text-[24px]">
            Προσκλήσεις που περιμένουν
          </h2>
          {invites.length === 0 ? (
            <p className="text-muted">Καμία πρόσκληση δεν περιμένει.</p>
          ) : (
            <ul className="flex flex-col border-b border-hairline">
              {invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline py-3">
                  <span className="flex-[1_1_240px] break-all font-typed">{invite.email}</span>
                  <span>{ROLES[invite.role]}</span>
                  <span className="text-muted">{inviteStatus(invite)}</span>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StaffSheet>
  );
}
