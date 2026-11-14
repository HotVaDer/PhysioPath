// Where every email link lands: the sign-in link, the invite link. It swaps the link's one-time
// proof for a login session (cookies), then sends the person on to "next". Two kinds of link:
//
// 1. Our email templates: …/auth/confirm?next=…&token_hash=…&type=email (or type=invite).
//    The proof is in the link itself, so it works on any device.
// 2. Supabase's default templates: the link goes to Supabase first, which sends the browser back
//    with ?code=…. That code only works in the browser that asked for the link (it needs the
//    secret Supabase saved in that browser's cookies when the form was sent).
//
// Supabase can also send the browser back with ?error_code=… (e.g. otp_expired) when the link
// was already used or is too old.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/app/lib/site";
import { createClient } from "@/app/lib/supabase/server";

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const failed = (reason: string) => NextResponse.redirect(new URL(`/login?link=${reason}`, request.url));

  if (params.get("error_code")) {
    console.error("Email link refused by Supabase:", params.get("error_code"));
    return failed("expired");
  }

  const supabase = await createClient();

  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("verifyOtp failed:", error.message);
    return failed("expired");
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("exchangeCodeForSession failed:", error.message);
    // Most often: the link was opened in a different browser or device than the one that asked for it.
    return failed("other-browser");
  }

  return failed("expired");
}
