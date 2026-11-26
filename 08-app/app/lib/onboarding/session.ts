// Who is signed in, where they are in the form, and the draft they're filling.
// Used by the registration pages and their server actions. getUser() asks Supabase to confirm
// the login every time, so a forged cookie gets nowhere.
import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DemoLeft } from "@/app/lib/demo/left";
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
  // Set when the open clinic is a demo clinic («Δοκιμάστε το», /try): when it is deleted, the language
  // the visitor picked, and what is left of its 5 programs and 5 recordings (shown in the yellow strip).
  // Optional so the many test profiles stay as they are.
  demo?: { expiresAt: string; lang: "el" | "en"; left?: DemoLeft | null } | null;
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
    .select(
      "clinic_id, role, full_name, onboarded_at, clinic:clinics!profiles_clinic_id_fkey(name, is_demo, demo_expires_at, demo_lang)",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  // Without generated database types the client guesses a list here; one clinic per profile comes back.
  const { clinic, ...profile } = data as unknown as Omit<Profile, "clinic_name" | "demo"> & {
    clinic: { name: string; is_demo?: boolean; demo_expires_at?: string | null; demo_lang?: string | null } | null;
  };
  let demo: Profile["demo"] = null;
  if (clinic?.is_demo && clinic.demo_expires_at) {
    // One more read, only in a demo clinic.
    const left = DemoLeft.safeParse((await supabase.rpc("demo_ai_left")).data);
    demo = {
      expiresAt: clinic.demo_expires_at,
      lang: clinic.demo_lang === "en" ? "en" : "el",
      left: left.success ? left.data : null,
    };
  }
  return { ...profile, clinic_name: clinic?.name ?? null, demo };
}

// Every clinic the person belongs to, by name, with the one open now marked.
export async function loadMyClinics(supabase: Supabase): Promise<MyClinic[]> {
  const { data, error } = await supabase.rpc("my_clinics");
  if (error) throw new Error(`Loading the clinics failed: ${error.message}`);
  return (data as MyClinic[] | null) ?? [];
}

// Someone in the clinic, for the owner's «Η ομάδα σας» (public.clinic_members()).
const MemberSchema = z.object({
  userId: z.uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(["owner", "physio", "assistant"]),
  me: z.boolean(),
});
export type ClinicMember = z.infer<typeof MemberSchema>;

export async function loadClinicMembers(supabase: Supabase, clinicId: string): Promise<ClinicMember[]> {
  const { data, error } = await supabase.rpc("clinic_members", { p_clinic: clinicId });
  if (error) throw new Error(`Loading the team failed: ${error.message}`);
  return z.array(MemberSchema).parse(data);
}

// An invite waiting for the signed-in person (public.my_invites(): their own confirmed email only).
const MyInviteSchema = z.object({
  token: z.uuid(),
  role: z.enum(["physio", "assistant"]),
  clinicName: z.string(),
  clinicCity: z.string().nullable(),
  invitedBy: z.string().nullable(),
});
export type MyInvite = z.infer<typeof MyInviteSchema>;

// The person's waiting invites, newest first. A note on top of a page, never a reason for the page to
// fail: on any problem, none.
export async function loadMyInvites(supabase: Supabase): Promise<MyInvite[]> {
  const { data, error } = await supabase.rpc("my_invites");
  if (error) {
    console.error("my_invites failed:", error.message);
    return [];
  }
  const parsed = z.array(MyInviteSchema).safeParse(data);
  return parsed.success ? parsed.data : [];
}

export async function loadDraft(supabase: Supabase): Promise<Draft> {
  const { data } = await supabase.from("onboarding_drafts").select("data").maybeSingle();
  const parsed = DraftSchema.safeParse(data?.data ?? {});
  return parsed.success ? parsed.data : {};
}

// Saves one sheet's answers into the signed-in person's draft, keeping the other sheets' answers.
// Through save_onboarding_draft: users can't write to the tables themselves (20261122150000).
export async function saveDraft(supabase: Supabase, patch: Partial<Draft>): Promise<void> {
  const current = await loadDraft(supabase);
  const { error } = await supabase.rpc("save_onboarding_draft", { p_data: { ...current, ...patch } });
  if (error) throw new Error(`Saving the draft failed: ${error.message}`);
}

// For the sign-up clinic step: signed in, not yet in a clinic. Others are sent where they belong.
export async function requireFormUser() {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/welcome");
  if (user.is_anonymous) redirect("/try"); // a demo visitor makes only demo clinics (the database refuses others)
  const profile = await loadProfile(supabase, user.id);
  if (profile?.onboarded_at) redirect("/");
  const draft = await loadDraft(supabase);
  // The name typed in sign-up step 1 (saved with the account when the code was sent).
  if (!draft.ownerName && typeof user.user_metadata?.full_name === "string") draft.ownerName = user.user_metadata.full_name;
  return { supabase, user, draft };
}

// For pages that need a clinic member. Signed in but in no clinic (taken out of a team, left, or
// stopped before the clinic step) → /start: a welcome, their invites, and registering a clinic if they want.
// noLogin: where someone with no login goes (the welcome page, unless the page knows better).
export async function requireMember(noLogin: "/welcome" | "/try?lost=1" = "/welcome") {
  const { supabase, user } = await currentUser();
  if (!user) redirect(noLogin);
  const profile = await loadProfile(supabase, user.id);
  if (!profile?.onboarded_at || !profile.clinic_id) redirect("/start");
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
