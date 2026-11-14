// Runs before every page request: keeps the Supabase login fresh.
// The login lives in cookies with a short-lived token; when it's about to expire, Supabase swaps
// it for a new one here and we write the new cookies onto the response. Pages then decide who may
// see what (they check the user with Supabase themselves), so this file never blocks anyone.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // The page rendered after this proxy must see the new token too, so set it on the request…
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        // …and on the response, so the browser keeps it.
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });

  // Checks the token's signature and refreshes it when needed. Don't add code between
  // createServerClient and this line: it could log people out at random.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Every page, but not Next's own files or the tab icon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
