// POST /api/sessions/<id>/events  { type: "setDone" | "undoSet" | "call" | "cancelCall", … }
// What the patient taps on their session screen. Patient route: also reachable from a phone on the
// Wi-Fi in same-Wi-Fi mode. Returns the updated session, without the clinical note.
import { HttpError, handler, readJson } from "@/app/lib/http";
import { PatientAction, applyPatientAction, patientView } from "@/app/lib/session";
import { updateSession } from "@/app/lib/sessions";

export const POST = handler(
  async (request, ctx: RouteContext<"/api/sessions/[id]/events">) => {
    const action = PatientAction.safeParse(await readJson(request));
    if (!action.success) throw new HttpError(400, "Invalid request.");
    const session = await updateSession((await ctx.params).id, (s, now) => applyPatientAction(s, action.data, now));
    if (!session) throw new HttpError(404, "Not found.");
    return patientView(session);
  },
  { lan: true },
);
