// Who is signed in, where they are in the form, and the draft they're filling.
// Used by the registration pages and their server actions. getUser() asks Supabase to confirm
// the login every time, so a forged cookie gets nowhere.
import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { DraftSchema, type Draft } from "@/app/lib/onboarding/schema";
import { createClient, type Supabase } from "@/app/lib/supabase/server";

export type Profile = {
  clinic_id: string | null;
  role: "owner" | "physio" | "assistant";
  full_name: string | null;
  onboarded_at: string | null;
};

export async function currentUser(): Promise<{ supabase: Supabase; user: User | null }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function loadProfile(supabase: Supabase, userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("clinic_id, role, full_name, onboarded_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function loadDraft(supabase: Supabase): Promise<Draft> {
  const { data } = await supabase.from("onboarding_drafts").select("data").maybeSingle();
  const parsed = DraftSchema.safeParse(data?.data ?? {});
  return parsed.success ? parsed.data : {};
}

// Saves one sheet's answers into the draft, keeping the other sheets' answers.
export async function saveDraft(supabase: Supabase, userId: string, patch: Partial<Draft>): Promise<void> {
  const current = await loadDraft(supabase);
  const { error } = await supabase
    .from("onboarding_drafts")
    .upsert({ user_id: userId, data: { ...current, ...patch }, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Saving the draft failed: ${error.message}`);
}

// For the sheets §1–§4: signed in, not yet in a clinic. Others are sent where they belong.
export async function requireFormUser() {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/register");
  const profile = await loadProfile(supabase, user.id);
  if (profile?.onboarded_at) redirect("/");
  const draft = await loadDraft(supabase);
  // Prefill the name typed on the cover (saved with the account when the link was sent).
  if (!draft.ownerName && typeof user.user_metadata?.full_name === "string") draft.ownerName = user.user_metadata.full_name;
  return { supabase, user, draft };
}

// For pages that need a clinic member.
export async function requireMember() {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/register");
  const profile = await loadProfile(supabase, user.id);
  if (!profile?.onboarded_at || !profile.clinic_id) redirect("/register/clinic");
  return { supabase, user, profile };
}
