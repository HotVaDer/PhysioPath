"use server";
// «Δοκιμάστε το»: the buttons of the demo. Each action is reachable by anyone who can send a POST, so
// each one checks again who is signed in; the database checks everything once more (start_demo only for
// an anonymous login, refill_demo only in a demo clinic: migration 20261124120000_demo_clinics.sql).
import { redirect } from "next/navigation";

import { demoText, pickLang, pickRef } from "@/app/lib/demo/text";
import { currentUser, loadProfile } from "@/app/lib/onboarding/session";

export type DemoFormState = { message?: string };

// The button on /try. A visitor with no login gets an anonymous one (no email, no password), then a demo
// clinic full of fictional patients. Someone already in a demo goes straight back to it; someone with a
// real account is never turned into a visitor (the page doesn't show them the button).
export async function startDemo(_: DemoFormState, form: FormData): Promise<DemoFormState> {
  const lang = pickLang(form.get("lang"));
  const ref = pickRef(form.get("ref"));
  const t = demoText(lang);
  const { supabase, user } = await currentUser();

  if (user && !user.is_anonymous) redirect("/"); // a real account: the app, not a demo
  if (!user) {
    const captchaToken = String(form.get("captchaToken") ?? "").slice(0, 4096) || undefined;
    const { error } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
    if (error) {
      if (error.status === 429 || error.code?.includes("rate_limit")) return { message: t.busy };
      if (error.code === "captcha_failed" || /captcha/i.test(error.message)) {
        console.error("Captcha refused by Supabase (demo):", error.message);
        return { message: /no captcha_token/i.test(error.message) ? t.captchaWait : t.captchaFailed };
      }
      console.error("signInAnonymously failed:", error);
      return { message: t.failed };
    }
  }

  const { error } = await supabase.rpc("start_demo", { p_ref: ref ?? null, p_lang: lang });
  if (error) {
    console.error("start_demo failed:", error.message);
    return { message: t.failed };
  }
  redirect("/?demo=1");
}

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
