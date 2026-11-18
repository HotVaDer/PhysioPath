"use server";
// The owner's settings after sign-up: the rooms, and inviting the team (one person at a time).
// Reached from the home page («Επόμενα βήματα») and from «Χώροι» / «Ομάδα» there.
// Every action checks again that the owner is signed in; the database checks it a third time
// (save_rooms, add_invites: supabase/migrations/20261116120000_settings_rooms_team.sql).
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/app/lib/onboarding/actions";
import { sendInvites } from "@/app/lib/onboarding/invites";
import { MemberSchema, SettingsRoomsSchema, fieldErrors } from "@/app/lib/onboarding/schema";
import { requireOwner, requireSameClinic } from "@/app/lib/onboarding/session";

const now = () =>
  new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Nicosia" }).format(new Date());

// ---------- Χώροι: «Αποθήκευση» ----------
export async function saveRooms(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, profile } = await requireOwner();
  requireSameClinic(form, profile);
  let raw: unknown = null;
  try {
    raw = JSON.parse(String(form.get("rooms") ?? ""));
  } catch {
    // not JSON: the check below says what's wrong
  }
  const parsed = SettingsRoomsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Κάτι δεν είναι σωστό. Δείτε τα μηνύματα με κόκκινο πιο κάτω." };
  }

  const { error } = await supabase.rpc("save_rooms", { items: parsed.data });
  if (error) {
    const inUse = /room in use: (.+)$/.exec(error.message);
    if (inUse) {
      return {
        message: `Στο «${inUse[1]}» υπάρχει ασθενής αυτή τη στιγμή, σε κρεβάτι ή θέση που θέλετε να αφαιρέσετε. Κάντε αυτή την αλλαγή όταν τελειώσει η θεραπεία.`,
      };
    }
    console.error("save_rooms failed:", error);
    return { message: "Οι αλλαγές δεν αποθηκεύτηκαν. Δοκιμάστε ξανά σε λίγο." };
  }
  redirect("/?saved=rooms");
}

// ---------- Ομάδα: «Αποστολή πρόσκλησης» (one person) ----------
// One email and one role per press, so nothing typed can be left behind unsent.
export async function inviteMember(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, profile } = await requireOwner();
  requireSameClinic(form, profile);
  const values = { email: String(form.get("email") ?? ""), role: String(form.get("role") ?? "") };
  const parsed = MemberSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { data, error } = await supabase.rpc("add_invites", { items: [parsed.data] });
  if (error) {
    const known: [RegExp, string][] = [
      [/own email/, "Αυτό είναι το δικό σας email. Είστε ήδη στην κλινική."],
      [/already in the team/, "Αυτό το άτομο είναι ήδη στην ομάδα σας."],
      [/already invited/, "Έχετε ήδη καλέσει αυτό το email. Αν δεν βρήκε την πρόσκληση, πατήστε «Ξανά αποστολή» στη λίστα πιο κάτω."],
    ];
    const hit = known.find(([re]) => re.test(error.message));
    if (hit) return { errors: { email: hit[1] }, values };
    console.error("add_invites failed:", error);
    return { message: "Η πρόσκληση δεν στάλθηκε. Δοκιμάστε ξανά σε λίγο.", values };
  }

  await supabase.from("clinics").update({ team_checked_at: new Date().toISOString() }).eq("id", profile.clinic_id);
  const { data: clinic } = await supabase.from("clinics").select("name").eq("id", profile.clinic_id).maybeSingle();
  const invites = (data ?? []) as { email: string; role: string; token: string }[];
  const { sent } = await sendInvites(invites, { clinicName: clinic?.name ?? "", ownerName: profile.full_name ?? "" });
  const q = new URLSearchParams({ invite: sent ? "new" : "not-sent", to: parsed.data.email, at: now() });
  redirect(`/settings/team?${q}` as Route);
}

// ---------- Ομάδα: «Ακύρωση» of an invite nobody accepted yet ----------
export async function cancelInvite(form: FormData): Promise<void> {
  const { supabase, profile } = await requireOwner();
  requireSameClinic(form, profile);
  const id = z.uuid().safeParse(form.get("inviteId"));
  if (!id.success) redirect("/settings/team");
  // RLS: only the owner, only their clinic, only invites not accepted yet.
  const { data } = await supabase.from("invites").delete().eq("id", id.data).select("email");
  const email = data?.[0]?.email;
  redirect((email ? `/settings/team?invite=cancelled&to=${encodeURIComponent(email)}` : "/settings/team") as Route);
}

// ---------- Home: «Δουλεύω μόνη/ος» (no team to invite) ----------
export async function workAlone(form: FormData): Promise<void> {
  const { supabase, profile } = await requireOwner();
  requireSameClinic(form, profile);
  await supabase.from("clinics").update({ team_checked_at: new Date().toISOString() }).eq("id", profile.clinic_id);
  redirect("/?saved=alone");
}
