// /api/s/<token>: the patient's phone, no login (the token in the link is the key).
//   GET   the session now: the phone asks every 3 s
//   POST  one tap: { type: setDone | undoSet | show | call | cancelCall, exercise?, set?, reason? }
// Both answer with the session as the phone shows it (never the note), or 404 for a wrong token.
// Every answer is no-store (respond() in app/lib/notes/http.ts), so no cache keeps someone's progress.
import { PatientAction } from "@/app/lib/board/session";
import { loadPatientView, sendPatientAction } from "@/app/lib/board/patient";
import { HttpError, readBody, respond } from "@/app/lib/notes/http";

const NOT_FOUND = "Δεν βρέθηκε αυτή η συνεδρία. Ζητήστε από τον φυσιοθεραπευτή να σας δείξει ξανά τον κωδικό QR.";
const BAD_TAP = "Αυτό το πάτημα δεν έγινε. Δοκιμάστε ξανά.";

export async function GET(_request: Request, ctx: RouteContext<"/api/s/[token]">) {
  return respond(async () => {
    const { token } = await ctx.params;
    const view = await loadPatientView(token);
    if (!view) throw new HttpError(404, NOT_FOUND);
    return view;
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/s/[token]">) {
  return respond(async () => {
    const { token } = await ctx.params;
    // A tap is a few bytes; anything bigger isn't from our phone screen.
    const body = await readBody(request, 1024, BAD_TAP);
    let json: unknown;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch {
      throw new HttpError(400, BAD_TAP);
    }
    const action = PatientAction.safeParse(json);
    if (!action.success) throw new HttpError(400, BAD_TAP);
    const view = await sendPatientAction(token, action.data);
    if (!view) throw new HttpError(404, NOT_FOUND);
    return view;
  });
}
