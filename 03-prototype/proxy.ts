// Runs before every page request. From another device on the Wi-Fi (same-Wi-Fi mode), only the
// patient's pages are served: the session screen /s/… and the home program /p/…. The physio's pages
// (recording, review, room board) stay on this Mac. API routes check this themselves (http.ts),
// and are left out here because the proxy would buffer and cut large audio uploads.
import { NextResponse, type NextRequest } from "next/server";

import { LOCAL_HOSTNAMES, hostnameOf } from "@/app/lib/lan";

const PATIENT_PAGES = /^\/(s|p)\/[^/]+$/;

export function proxy(request: NextRequest) {
  const local = LOCAL_HOSTNAMES.includes(hostnameOf(request.headers.get("host") ?? ""));
  if (local || PATIENT_PAGES.test(request.nextUrl.pathname)) return NextResponse.next();
  return new NextResponse("Αυτή η σελίδα ανοίγει μόνο από τον υπολογιστή του φυσιοθεραπευτή.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  // Everything except API routes, Next.js's own files and the tab icon.
  matcher: ["/((?!api/|_next/|icon\\.svg|favicon\\.ico).*)"],
};
