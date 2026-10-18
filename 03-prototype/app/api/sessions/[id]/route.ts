// GET /api/sessions/<id>: the patient's session screen loads its exercises and progress.
// Patient route: also reachable from a phone on the Wi-Fi in same-Wi-Fi mode. Never includes the clinical note.
import { HttpError, handler } from "@/app/lib/http";
import { patientView } from "@/app/lib/session";
import { getSession } from "@/app/lib/sessions";

export const GET = handler(
  async (_request, ctx: RouteContext<"/api/sessions/[id]">) => {
    const session = getSession((await ctx.params).id);
    if (!session) throw new HttpError(404, "Not found.");
    return patientView(session);
  },
  { lan: true },
);
