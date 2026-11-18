// GET /api/board: the room board asks every 3 s. Signed-in staff only; what they see is decided by
// the database (their clinic's rooms and open cards). Only the login is checked here, not the whole
// profile, because this runs every few seconds on every open board.
import { loadBoard } from "@/app/lib/board/board";
import { HttpError, respond } from "@/app/lib/notes/http";
import { currentUser } from "@/app/lib/onboarding/session";

export async function GET() {
  return respond(async () => {
    const { supabase, user } = await currentUser();
    if (!user) throw new HttpError(401, "Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.");
    return loadBoard(supabase);
  });
}
