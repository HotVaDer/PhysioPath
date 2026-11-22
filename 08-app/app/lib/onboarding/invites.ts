// Sending invite emails. Used after the owner invites someone (Ρυθμίσεις → Ομάδα) and by
// «Ξανά αποστολή». Server only: it uses the secret key.
import "server-only";

import type { User } from "@supabase/supabase-js";

import { confirmLink, siteUrl } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";

// One email per invite. New people get our invite email (supabase/templates/invite.html; Supabase
// also creates their account); people who already have an account get a sign-in link instead.
// Both land on /invite/<token>. "data" fills the invite email's text: clinic, who invites, the role.
const ROLE_IN_EMAIL: Record<string, string> = { physio: "φυσιοθεραπευτή", assistant: "βοηθό" };

// The owner never gets invite tokens (the secret in the link): add_invites returns ids only. The server
// reads the tokens here with the secret key, only for open invites of the owner's own clinic, just to
// write the emails. No secret key: nothing can be sent anyway.
export async function inviteTokens(ids: string[], clinicId: string): Promise<{ email: string; role: string; token: string }[]> {
  const admin = createAdminClient();
  if (!admin || ids.length === 0) return [];
  const { data, error } = await admin
    .from("invites")
    .select("email, role, token")
    .in("id", ids)
    .eq("clinic_id", clinicId)
    .is("accepted_at", null);
  if (error) console.error("Reading the invite tokens failed:", error.message);
  return (data ?? []) as { email: string; role: string; token: string }[];
}

export async function sendInvites(
  invites: { email: string; role: string; token: string }[],
  from: { clinicName: string; ownerName: string },
) {
  const admin = createAdminClient();
  let sent = 0;
  for (const invite of invites) {
    if (!admin) break; // no secret key yet: nothing can be sent
    const redirectTo = confirmLink(`/invite/${invite.token}`);
    // The invite page itself, for after the email's button has expired (1 hour): open it, sign in with
    // a code, accept. The invite lasts 7 days (supabase/templates/invite.html says so).
    const inviteUrl = `${siteUrl()}/invite/${invite.token}`;
    const { error } = await admin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo,
      data: {
        clinic_name: from.clinicName,
        invited_by: from.ownerName,
        role_label: ROLE_IN_EMAIL[invite.role] ?? "",
        invite_url: inviteUrl,
      },
    });
    if (!error) {
      sent++;
      continue;
    }
    if (error.code === "email_exists" || error.status === 422) {
      // They already have an account, so Supabase sends its sign-in email (magic_link.html) instead of
      // the invite. Put the invite in their account first, so that email says «Η κλινική Χ σας
      // προσκάλεσε» instead of "ignore this if you didn't ask". It is cleared once they sign in.
      const { data: userId } = await admin.rpc("user_id_for_email", { p_email: invite.email });
      if (typeof userId === "string") {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: { invite_clinic: from.clinicName, invite_by: from.ownerName, invite_url: inviteUrl },
        });
      }
      // Through the admin client: Supabase skips the "not a robot" check for the secret key
      // (the owner already passed sign-in; there's no form on this side).
      const again = await admin.auth.signInWithOtp({
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

// After someone signs in: the invite wording in their sign-in email has done its job (the app shows
// waiting invites itself), so the next sign-in email is a plain one again. Never stops the sign-in.
export async function forgetInviteEmail(user: User | null | undefined) {
  if (!user?.user_metadata?.invite_clinic) return;
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { invite_clinic: null, invite_by: null, invite_url: null }, // null removes the key
  });
  if (error) console.error("Clearing the invite from the sign-in email failed:", error.message);
}
