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
//
// Kind 1 no longer signs in here: it goes on to /auth/continue, a page with a «Συνέχεια» button, and only
// that press signs in (followEmailLink). Work email systems (Outlook Safe Links) open every link to check
// it, which used up the one-time link before the person clicked; they don't press buttons. It also stops a
// stranger's link from signing someone into the stranger's account without a word.
// A link that fails keeps "next", so an invite stays an invite after signing in with a code.
import { NextResponse, type NextRequest } from "next/server";

import { isEmailLinkType, loginAfterLink, safeNext } from "@/app/lib/site";
import { createClient } from "@/app/lib/supabase/server";


export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const failed = (reason: "expired" | "other-browser") => NextResponse.redirect(new URL(loginAfterLink(reason, next), request.url));

  if (params.get("error_code")) {
    console.error("Email link refused by Supabase:", params.get("error_code"));
    return failed("expired");
  }

  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && isEmailLinkType(type)) {
    const query = new URLSearchParams({ token_hash: tokenHash, type, next });
    return NextResponse.redirect(new URL(`/auth/continue?${query}`, request.url));
  }

  const supabase = await createClient();

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
