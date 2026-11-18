// Who is signed in, where they are in the form, and the draft they're filling.
// Used by the registration pages and their server actions. getUser() asks Supabase to confirm
// the login every time, so a forged cookie gets nowhere.
import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { DraftSchema, type Draft } from "@/app/lib/onboarding/schema";
import { createClient, type Supabase } from "@/app/lib/supabase/server";

// clinic_id is the clinic open right now (someone can belong to several: see my_clinics) and role is
// the role in that clinic. clinic_name is that clinic's name, for the top bar.
export type Profile = {
  clinic_id: string | null;
  role: "owner" | "physio" | "assistant";
  full_name: string | null;
  onboarded_at: string | null;
  clinic_name: string | null;
};

// One of the clinics someone belongs to (public.my_clinics()).
export type MyClinic = { id: string; name: string; city: string | null; role: Profile["role"]; current: boolean };

export async function currentUser(): Promise<{ supabase: Supabase; user: User | null }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function loadProfile(supabase: Supabase, userId: string): Promise<Profile | null> {
  // The clinic through the profile's own clinic_id (RLS shows only the open clinic anyway).
  const { data } = await supabase
    .from("profiles")
    .select("clinic_id, role, full_name, onboarded_at, clinic:clinics!profiles_clinic_id_fkey(name)")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  // Without generated database types the client guesses a list here; one clinic per profile comes back.
  const { clinic, ...profile } = data as unknown as Omit<Profile, "clinic_name"> & { clinic: { name: string } | null };
  return { ...profile, clinic_name: clinic?.name ?? null };
}

// Every clinic the person belongs to, by name, with the one open now marked.
export async function loadMyClinics(supabase: Supabase): Promise<MyClinic[]> {
  const { data, error } = await supabase.rpc("my_clinics");
  if (error) throw new Error(`Loading the clinics failed: ${error.message}`);
  return (data as MyClinic[] | null) ?? [];
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

// For the sign-up clinic step: signed in, not yet in a clinic. Others are sent where they belong.
export async function requireFormUser() {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/welcome");
  const profile = await loadProfile(supabase, user.id);
  if (profile?.onboarded_at) redirect("/");
  const draft = await loadDraft(supabase);
  // The name typed in sign-up step 1 (saved with the account when the code was sent).
  if (!draft.ownerName && typeof user.user_metadata?.full_name === "string") draft.ownerName = user.user_metadata.full_name;
  return { supabase, user, draft };
}

// For pages that need a clinic member.
export async function requireMember() {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/welcome");
  const profile = await loadProfile(supabase, user.id);
  if (!profile?.onboarded_at || !profile.clinic_id) redirect("/register/clinic");
  return { supabase, user, profile };
}

// Every form that saves something for the clinic carries the clinic it was opened for (a hidden
// "clinicId"). Opening another clinic changes it for every tab, so a page left open in another tab
// would otherwise save into the clinic opened since. Not a security check (the person belongs to both,
// and the database keeps every rule): it keeps their work in the clinic they meant. When it doesn't
// match, nothing is saved and they land on the open clinic's home, with a note saying so (?stale=1).
export function requireSameClinic(form: FormData, profile: Pick<Profile, "clinic_id">): void {
  if (!profile.clinic_id || form.get("clinicId") !== profile.clinic_id) redirect("/?stale=1");
}

// For the owner's settings (rooms, team). Physios and assistants go home.
export async function requireOwner() {
  const member = await requireMember();
  if (member.profile.role !== "owner") redirect("/");
  return member as typeof member & { profile: Profile & { clinic_id: string } };
}
