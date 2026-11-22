// /api/p/<token>: the patient's letter at home, no login (the token in the link is the key).
//   POST  one press: { day, exercise, status: done | skipped | null, pain, note }
// Answers { status: "ok", log } (the diary of the last 7 days, as saved), { status: "newer" } when the
// clinic has approved a newer program (nothing saved), or 404 for a wrong token.
// Every answer is no-store (respond() in app/lib/notes/http.ts).
import { LogChange } from "@/app/lib/home/log";
import { RefusedChange, saveHomeLog } from "@/app/lib/home/patient";
import { HttpError, readBody, respond } from "@/app/lib/notes/http";

const NOT_FOUND = "Δεν βρέθηκε αυτό το πρόγραμμα. Ζητήστε νέο σύνδεσμο από την κλινική σας.";
const BAD_PRESS = "Δεν αποθηκεύτηκε. Δοκιμάστε ξανά.";

export async function POST(request: Request, ctx: RouteContext<"/api/p/[token]">) {
  return respond(async () => {
    const { token } = await ctx.params;
    // A press with a 500-character note is about 2 KB of Greek; anything bigger isn't from our page.
    const body = await readBody(request, 4096, BAD_PRESS);
    let json: unknown;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch {
      throw new HttpError(400, BAD_PRESS);
    }
    const change = LogChange.safeParse(json);
    if (!change.success) throw new HttpError(400, BAD_PRESS);
    try {
      const answer = await saveHomeLog(token, change.data);
      if (!answer) throw new HttpError(404, NOT_FOUND);
      return answer;
    } catch (error) {
      if (error instanceof RefusedChange) throw new HttpError(400, BAD_PRESS);
      throw error;
    }
  });
}
