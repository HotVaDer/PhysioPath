// «Δοκιμάστε το»: what the button on /try does, for the route POST /try/start. A visitor with no login gets
// an anonymous one (no email, no password), then a demo clinic full of fictional patients. Someone already in
// a demo goes straight back to it; someone with a real account is never turned into a visitor.
//
// Why a route and not a server action (2026-11-25): a server action sends the new login cookie with a
// background request and then changes page in the browser. The browsers built into WhatsApp, Viber and
// Messenger sometimes hadn't stored that cookie yet, so the board saw no login and showed the welcome page
// (the demo had been made, the visitor never saw it). A normal form post answered with a redirect carries
// the cookie with a full page load, which every browser keeps.
import "server-only";

import { pickLang, pickRef } from "@/app/lib/demo/text";
import { currentUser } from "@/app/lib/onboarding/session";

// The four things that can go wrong, by the name of their message in text.ts (shown back on /try?e=…).
export const START_ERRORS = ["failed", "busy", "captchaWait", "captchaFailed"] as const;
export type StartError = (typeof START_ERRORS)[number];
export type StartResult = { to: "/" | "/?demo=1" } | { error: StartError };

export async function beginDemo(form: FormData): Promise<StartResult> {
  const lang = pickLang(form.get("lang"));
  const ref = pickRef(form.get("ref"));
  const { supabase, user } = await currentUser();
  if (user && !user.is_anonymous) return { to: "/" }; // a real account: the app, not a demo
  if (!user) {
    const captchaToken = String(form.get("captchaToken") ?? "").slice(0, 4096) || undefined;
    const { error } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
    if (error) {
      if (error.status === 429 || error.code?.includes("rate_limit")) return { error: "busy" };
      if (error.code === "captcha_failed" || /captcha/i.test(error.message)) {
        console.error("Captcha refused by Supabase (demo):", error.message);
        return { error: /no captcha_token/i.test(error.message) ? "captchaWait" : "captchaFailed" };
      }
      console.error("signInAnonymously failed:", error);
      return { error: "failed" };
    }
  }
  const { error } = await supabase.rpc("start_demo", { p_ref: ref ?? null, p_lang: lang });
  if (error) {
    console.error("start_demo failed:", error.message);
    return { error: "failed" };
  }
  return { to: "/?demo=1" };
}
