"use server";
// What happens when someone presses a button on the registration form.
// Each action is reachable by anyone who can send a POST, so each one checks who is signed in
// and validates every field again; the browser's own checks are only a convenience.
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ClinicSchema,
  CoverSchema,
  FilingSchema,
  LoginSchema,
  RoomsSchema,
  TeamSchema,
  fieldErrors,
  type FieldErrors,
} from "@/app/lib/onboarding/schema";
import { currentUser, requireFormUser, requireMember, saveDraft } from "@/app/lib/onboarding/session";
import { safeNext, siteUrl } from "@/app/lib/site";
import { createAdminClient, createAnonClient } from "@/app/lib/supabase/admin";

// What a form gets back when something is wrong. React clears a form after it's sent, so the
// typed values come back too and the fields refill.
export type FormState = { errors?: FieldErrors; message?: string; values?: Record<string, string> };

function texts(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
}

function parseJson(form: FormData, key: string): unknown {
  try {
    return JSON.parse(String(form.get(key) ?? "null"));
  } catch {
    return null;
  }
}

function confirmLink(next: string): string {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function linkError(error: { status?: number; code?: string; message: string }): string {
  if (error.status === 429 || error.code?.includes("rate_limit")) {
    return "Στείλαμε ήδη σύνδεσμο πριν από λίγο. Περιμένετε ένα λεπτό και ξαναδοκιμάστε.";
  }
  if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
    return "Δεν βρήκαμε λογαριασμό με αυτό το email. Για νέα κλινική, ξεκινήστε από την εγγραφή.";
  }
  console.error("signInWithOtp failed:", error);
  return "Δεν μπορέσαμε να στείλουμε τον σύνδεσμο. Δοκιμάστε ξανά σε λίγο.";
}

// ---------- Cover and login: send the sign-in link ----------
export async function sendLink(_: FormState, form: FormData): Promise<FormState> {
  const login = form.get("mode") === "login";
  const values = texts(form, ["fullName", "email"]);
  const parsed = login ? LoginSchema.safeParse(values) : CoverSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const next = safeNext(String(form.get("next") ?? ""), login ? "/" : "/register/clinic");
  const { supabase } = await currentUser();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: !login, // the login page never creates accounts by accident
      emailRedirectTo: confirmLink(next),
      data: "fullName" in parsed.data ? { full_name: parsed.data.fullName } : undefined,
    },
  });
  if (error) return { message: linkError(error), values };
  const email = encodeURIComponent(parsed.data.email);
  redirect(login ? `/login/check-email?email=${email}` : `/register/check-email?email=${email}`);
}

// ---------- §1 Στοιχεία κλινικής ----------
export async function saveClinic(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireFormUser();
  const values = texts(form, ["ownerName", "clinicName", "city", "phone"]);
  const parsed = ClinicSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  await saveDraft(supabase, user.id, parsed.data);
  redirect("/register/rooms");
}

// ---------- §2 Χώροι (the ledger sends its rows as JSON) ----------
export async function saveRooms(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireFormUser();
  const parsed = RoomsSchema.safeParse(parseJson(form, "rooms"));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Διορθώστε τις γραμμές με σημείωση." };
  await saveDraft(supabase, user.id, { rooms: parsed.data });
  redirect("/register/team");
}

// ---------- §3 Ομάδα ----------
export async function saveTeam(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireFormUser();
  const parsed = TeamSchema.safeParse(parseJson(form, "team"));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: parsed.error.issues[0]?.message };
  // The owner is already in the clinic; inviting their own email would do nothing.
  const own = user.email?.toLowerCase();
  await saveDraft(supabase, user.id, { team: parsed.data.filter((m) => m.email !== own) });
  redirect("/register/sign");
}

// ---------- §4 Υπογραφή και κατάθεση ----------
export async function fileRegistration(_: FormState, form: FormData): Promise<FormState> {
  if (form.get("consent") !== "on") {
    return { errors: { consent: "Για να συνεχίσετε, χρειάζεται η συμφωνία σας." } };
  }
  const { supabase, draft } = await requireFormUser();
  const ready = FilingSchema.safeParse(draft);
  if (!ready.success) {
    // Something's missing (e.g. the draft was changed elsewhere): back to the first sheet with a problem.
    const first = String(ready.error.issues[0]?.path[0] ?? "");
    redirect(first === "rooms" ? "/register/rooms" : first === "team" ? "/register/team" : "/register/clinic");
  }

  const { data, error } = await supabase.rpc("finish_onboarding");
  if (error) {
    console.error("finish_onboarding failed:", error);
    return { message: "Η κατάθεση δεν έγινε και δεν αποθηκεύτηκε τίποτα. Δοκιμάστε ξανά σε λίγο." };
  }

  const result = z
    .object({ invites: z.array(z.object({ email: z.string(), role: z.string(), token: z.string() })) })
    .safeParse(data);
  const { sent, notSent } = await sendInvites(result.success ? result.data.invites : [], {
    clinicName: ready.data.clinicName,
    ownerName: ready.data.ownerName,
  });
  redirect(`/register/done?sent=${sent}&notSent=${notSent}`);
}

// One email per invite. New people get our invite email (supabase/templates/invite.html; Supabase
// also creates their account); people who already have an account get a sign-in link instead.
// Both land on /invite/<token>. "data" fills the invite email's text: clinic, who invites, the role.
const ROLE_IN_EMAIL: Record<string, string> = { physio: "φυσιοθεραπευτή", assistant: "βοηθό" };

async function sendInvites(
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

// ---------- «Ξανά αποστολή» (home page, owner only) ----------
// Sends one open invite again and gives it 7 more days. The owner can't read tokens (RLS), so the
// server reads it with the secret key, but only after checking the invite belongs to the owner's clinic.
export async function resendInvite(form: FormData): Promise<void> {
  const { supabase, profile } = await requireMember();
  const id = z.uuid().safeParse(form.get("inviteId"));
  const admin = createAdminClient();
  if (profile.role !== "owner" || !id.success || !admin) redirect("/?invite=not-sent");

  const { data: invite } = await admin
    .from("invites")
    .select("id, email, role, token")
    .eq("id", id.data)
    .eq("clinic_id", profile.clinic_id)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) redirect("/?invite=not-sent");

  await admin.from("invites").update({ expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() }).eq("id", invite.id);
  const { data: clinic } = await supabase.from("clinics").select("name").eq("id", profile.clinic_id).maybeSingle();
  const { sent } = await sendInvites([invite], { clinicName: clinic?.name ?? "", ownerName: profile.full_name ?? "" });
  // "to" and "at" make each press land on a new address, so the note always shows the latest send.
  const at = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Nicosia" }).format(new Date());
  redirect(`/?invite=${sent ? "sent" : "not-sent"}&to=${encodeURIComponent(invite.email)}&at=${encodeURIComponent(at)}`);
}

// ---------- Joining from an invite ----------
export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const values = texts(form, ["fullName"]);
  const token = z.uuid().safeParse(form.get("token"));
  const name = CoverSchema.shape.fullName.safeParse(values.fullName);
  if (!name.success) return { errors: { fullName: name.error.issues[0].message }, values };
  if (!token.success) return { message: "Αυτή η πρόσκληση δεν υπάρχει.", values };

  const { supabase, user } = await currentUser();
  if (!user) redirect(`/invite/${token.data}`);
  const { error } = await supabase.rpc("accept_invite", { invite_token: token.data, your_name: name.data });
  if (error) {
    const known: Record<string, string> = {
      "invite not valid": "Η πρόσκληση δεν ισχύει πια. Ζητήστε νέα από την κλινική.",
      "invite is for another email": "Η πρόσκληση είναι για άλλο email από αυτό που έχετε συνδεθεί.",
      "already in a clinic": "Ανήκετε ήδη σε κλινική.",
    };
    const message = Object.entries(known).find(([k]) => error.message.includes(k))?.[1];
    if (!message) console.error("accept_invite failed:", error);
    return { message: message ?? "Η αποδοχή δεν έγινε. Δοκιμάστε ξανά σε λίγο.", values };
  }
  redirect("/");
}

// ---------- Sign out ----------
export async function signOut(): Promise<void> {
  const { supabase } = await currentUser();
  await supabase.auth.signOut();
  redirect("/register");
}
