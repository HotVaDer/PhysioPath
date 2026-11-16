// Sending invite emails. Used after the owner invites someone (Ρυθμίσεις → Ομάδα) and by
// «Ξανά αποστολή». Server only: it uses the secret key.
import "server-only";

import { confirmLink } from "@/app/lib/site";
import { createAdminClient, createAnonClient } from "@/app/lib/supabase/admin";

// One email per invite. New people get our invite email (supabase/templates/invite.html; Supabase
// also creates their account); people who already have an account get a sign-in link instead.
// Both land on /invite/<token>. "data" fills the invite email's text: clinic, who invites, the role.
const ROLE_IN_EMAIL: Record<string, string> = { physio: "φυσιοθεραπευτή", assistant: "βοηθό" };

export async function sendInvites(
  invites: { email: string; role: string; token: string }[],
  from: { clinicName: string; ownerName: string },
) {
  const admin = createAdminClient();
  let sent = 0;
  for (const invite of invites) {
    if (!admin) break; // no secret key yet: nothing can be sent
    const redirectTo = confirmLink(`/invite/${invite.token}`);
    const { error } = await admin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo,
      data: { clinic_name: from.clinicName, invited_by: from.ownerName, role_label: ROLE_IN_EMAIL[invite.role] ?? "" },
    });
    if (!error) {
      sent++;
      continue;
    }
    if (error.code === "email_exists" || error.status === 422) {
      const again = await createAnonClient().auth.signInWithOtp({
        email: invite.email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      });
      if (!again.error) {
        sent++;
        continue;
      }
    }
    console.error(`Invite email to ${invite.email} failed:`, error);
  }
  return { sent, notSent: invites.length - sent };
}

