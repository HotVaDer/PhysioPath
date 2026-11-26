// POST /try/start: the button on /try (a normal form post, see app/lib/demo/start.ts for why).
// Success → 303 to the board, with the new login cookies on that same answer (Next.js adds the cookies the
// Supabase client set). A problem → 303 back to /try with its message (?e=…), the language and the r= code.
// 303 so the browser follows with a GET, as after any form.
//
// No origin check on purpose: another site posting here can at most start a demo in the visitor's own
// browser (a new login still needs the captcha), and a real account is never touched. Some built-in
// browsers send «Origin: null», and a check would lock out exactly the visitors this route is for.
import { NextResponse, type NextRequest } from "next/server";

import { beginDemo } from "@/app/lib/demo/start";
import { pickLang, pickRef } from "@/app/lib/demo/text";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => new FormData());
  const result = await beginDemo(form);
  if ("to" in result) return NextResponse.redirect(new URL(result.to, request.url), 303);

  const back = new URL("/try", request.url);
  back.searchParams.set("e", result.error);
  const ref = pickRef(form.get("ref"));
  if (ref) back.searchParams.set("r", ref);
  if (pickLang(form.get("lang")) === "en") back.searchParams.set("lang", "en");
  return NextResponse.redirect(back, 303);
}
