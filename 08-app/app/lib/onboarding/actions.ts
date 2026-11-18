"use server";
// What happens when someone presses a button in sign-up, sign-in or an invite.
// Each action is reachable by anyone who can send a POST, so each one checks who is signed in
// and validates every field again; the browser's own checks are only a convenience.
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  CodeSchema,
  CoverSchema,
  LoginSchema,
  RegisterClinicSchema,
  fieldErrors,
  firstRoom,
  type FieldErrors,
} from "@/app/lib/onboarding/schema";
import { currentUser, requireFormUser, requireMember, requireSameClinic, saveDraft } from "@/app/lib/onboarding/session";
import { sendInvites } from "@/app/lib/onboarding/invites";
import { confirmLink, safeNext } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";

// What a form gets back when something is wrong. React clears a form after it's sent, so the
// typed values come back too and the fields refill.
// "notice" is good news shown in green (e.g. "Στείλαμε νέο κωδικό").
export type FormState = { errors?: FieldErrors; message?: string; notice?: string; values?: Record<string, string> };

function texts(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
}

function linkError(error: { status?: number; code?: string; message: string }): string {
  if (error.status === 429 || error.code?.includes("rate_limit")) {
    return "Στείλαμε ήδη κωδικό πριν από λίγο. Περιμένετε ένα λεπτό και ξαναδοκιμάστε.";
  }
  if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
    return "Δεν βρήκαμε λογαριασμό με αυτό το email. Για νέα κλινική, πατήστε «Εγγραφή κλινικής» πιο κάτω.";
  }
  console.error("signInWithOtp failed:", error);
  return "Δεν μπορέσαμε να στείλουμε τον κωδικό. Δοκιμάστε ξανά σε λίγο.";
}

// Sends the email with the 6-digit code and the button (supabase/templates/confirmation.html for a
// new account, magic_link.html for an existing one). Returns a message when it didn't work.
async function sendCode(email: string, login: boolean, next: string, fullName?: string): Promise<string | null> {
  const { supabase } = await currentUser();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: !login, // the login page never creates accounts by accident
      emailRedirectTo: confirmLink(next), // where the button in the email goes
      data: fullName ? { full_name: fullName } : undefined,
    },
  });
  return error ? linkError(error) : null;
}

// Where the code page lives, with the email (and, for login, where to go after).
function codePage(email: string, login: boolean, next: string): string {
  const q = new URLSearchParams({ email });
  if (login && next !== "/") q.set("next", next);
  return `${login ? "/login/code" : "/register/code"}?${q}`;
}

// ---------- Sign-up step 1 and sign-in: send the code ----------
export async function sendLink(_: FormState, form: FormData): Promise<FormState> {
  const login = form.get("mode") === "login";
  const values = texts(form, ["fullName", "email"]);
  // Sign-up also asks for the name; sign-in only for the email.
  const cover = login ? null : CoverSchema.safeParse(values);
  const parsed = cover ?? LoginSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const next = safeNext(String(form.get("next") ?? ""), login ? "/" : "/register/clinic");
  const fullName = cover?.success ? cover.data.fullName : undefined;
  const problem = await sendCode(parsed.data.email, login, next, fullName);
  if (problem) return { message: problem, values };
  redirect(codePage(parsed.data.email, login, next) as Route); // only our own two code pages
}

// ---------- Sign-up step 2 and sign-in: check the code ----------
export async function verifyCode(_: FormState, form: FormData): Promise<FormState> {
  const login = form.get("mode") === "login";
  const values = texts(form, ["code"]);
  const email = LoginSchema.safeParse({ email: form.get("email") });
  if (!email.success) redirect(login ? "/login" : "/register"); // the page lost the email: start again
  const code = CodeSchema.safeParse(values.code);
  if (!code.success) return { errors: { code: code.error.issues[0].message }, values };

  const { supabase } = await currentUser();
  const { error } = await supabase.auth.verifyOtp({ email: email.data.email, token: code.data, type: "email" });
  if (error) {
    if (error.status === 429 || error.code?.includes("rate_limit")) {
      return { errors: { code: "Πολλές προσπάθειες. Περιμένετε λίγα λεπτά και ξαναδοκιμάστε." }, values };
    }
    if (error.code !== "otp_expired") console.error("verifyOtp (code) failed:", error);
    return {
      errors: { code: "Ο κωδικός δεν είναι σωστός ή έληξε. Ελέγξτε τον, ή πατήστε «Στείλτε μου νέο κωδικό»." },
      values,
    };
  }
  redirect(login ? (safeNext(String(form.get("next") ?? "")) as Route) : "/register/clinic"); // safeNext: only our own paths
}

// ---------- «Στείλτε μου νέο κωδικό» ----------
export async function resendCode(_: FormState, form: FormData): Promise<FormState> {
  const login = form.get("mode") === "login";
  const email = LoginSchema.safeParse({ email: form.get("email") });
  if (!email.success) redirect(login ? "/login" : "/register");
  const next = safeNext(String(form.get("next") ?? ""), login ? "/" : "/register/clinic");
  const problem = await sendCode(email.data.email, login, next);
  if (problem) return { message: problem };
  const at = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Nicosia" }).format(new Date());
  return { notice: `Στείλαμε νέο κωδικό στις ${at}. Ο προηγούμενος δεν ισχύει πια.` };
}

// ---------- Sign-up step 3: the clinic, then the account is ready ----------
export async function finishRegistration(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user, draft } = await requireFormUser();
  const values = texts(form, ["ownerName", "clinicName", "city", "phone", "beds"]);
  // The name typed in step 1 is reused; the field only shows when the account has none.
  if (!values.ownerName) values.ownerName = draft.ownerName ?? "";
  const parsed = RegisterClinicSchema.safeParse({ ...values, consent: form.get("consent") ?? undefined });
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values, message: "Κάτι λείπει. Δείτε τα μηνύματα με κόκκινο πιο κάτω." };
  }

  const { ownerName, clinicName, city, phone, beds } = parsed.data;
  await saveDraft(supabase, user.id, { ownerName, clinicName, city, phone, rooms: firstRoom(beds), team: [] });
  const { error } = await supabase.rpc("finish_onboarding");
  if (error) {
    console.error("finish_onboarding failed:", error);
    return { message: "Η εγγραφή δεν ολοκληρώθηκε. Τα στοιχεία σας κρατήθηκαν: δοκιμάστε ξανά σε λίγο.", values };
  }
  redirect("/?welcome=1");
}

// ---------- «Ξανά αποστολή» (Ρυθμίσεις → Ομάδα, owner only) ----------
// Sends one open invite again and gives it 7 more days. The owner can't read tokens (RLS), so the
// server reads it with the secret key, but only after checking the invite belongs to the owner's clinic.
export async function resendInvite(form: FormData): Promise<void> {
  const { supabase, profile } = await requireMember();
  requireSameClinic(form, profile);
  const id = z.uuid().safeParse(form.get("inviteId"));
  const admin = createAdminClient();
  if (profile.role !== "owner" || !id.success || !admin) redirect("/settings/team?invite=not-sent");

  const { data: invite } = await admin
    .from("invites")
    .select("id, email, role, token")
    .eq("id", id.data)
    .eq("clinic_id", profile.clinic_id)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) redirect("/settings/team?invite=not-sent");

  await admin.from("invites").update({ expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() }).eq("id", invite.id);
  const { data: clinic } = await supabase.from("clinics").select("name").eq("id", profile.clinic_id).maybeSingle();
  const { sent } = await sendInvites([invite], { clinicName: clinic?.name ?? "", ownerName: profile.full_name ?? "" });
  // "to" and "at" make each press land on a new address, so the note always shows the latest send.
  const at = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Nicosia" }).format(new Date());
  redirect(`/settings/team?invite=${sent ? "sent" : "not-sent"}&to=${encodeURIComponent(invite.email)}&at=${encodeURIComponent(at)}`);
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
      "already in this clinic": "Είστε ήδη στην ομάδα αυτής της κλινικής.",
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
  redirect("/welcome");
}
