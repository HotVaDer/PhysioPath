"use server";
// «Δοκιμάστε το»: the buttons of the demo. Each action is reachable by anyone who can send a POST, so
// each one checks again who is signed in; the database checks everything once more (start_demo only for
// an anonymous login, refill_demo only in a demo clinic: migration 20261124120000_demo_clinics.sql).
import { redirect } from "next/navigation";

import { currentUser, loadProfile } from "@/app/lib/onboarding/session";

// The button on /try starts a demo through the route POST /try/start (app/lib/demo/start.ts), not here:
// built-in browsers lost the login a server action sent back (2026-11-25).

// «Θέλω τη δική μου κλινική»: out of the demo (the visitor's login is only signed out here; the nightly
// cleanup deletes the demo after its 7 days), then the normal sign-up, which starts a clean clinic.
export async function leaveDemo(): Promise<void> {
  const { supabase, user } = await currentUser();
  if (user?.is_anonymous) await supabase.auth.signOut({ scope: "local" });
  redirect("/register");
}

// «Ξαναγέμισε την αίθουσα»: the demo patients back on the board (the board shows the last 12 hours).
export async function refillDemo(): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/welcome");
  const profile = await loadProfile(supabase, user.id);
  if (!profile?.demo) redirect("/");
  const { error } = await supabase.rpc("refill_demo");
  if (error) console.error("refill_demo failed:", error.message);
  redirect("/");
}
