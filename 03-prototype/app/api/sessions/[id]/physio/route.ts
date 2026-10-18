// POST /api/sessions/<id>/physio  { type: "clearCall" | "finish" }  (this Mac only)
// clearCall: the physio saw the patient's call. finish: the session ends and becomes the patient's
// home program and the clinical note (saved like an approved program, output/<approvedId>.json).
import * as z from "zod";

import { HttpError, handler, readJson } from "@/app/lib/http";
import { saveApproved } from "@/app/lib/programs";
import { clearCall, finishSession } from "@/app/lib/session";
import { getSession, updateSession } from "@/app/lib/sessions";

const PhysioAction = z.object({ type: z.enum(["clearCall", "finish"]) });

export const POST = handler(async (request, ctx: RouteContext<"/api/sessions/[id]/physio">) => {
  const action = PhysioAction.safeParse(await readJson(request));
  if (!action.success) throw new HttpError(400, "Invalid request.");
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) throw new HttpError(404, "Not found.");

  if (action.data.type === "clearCall") {
    await updateSession(id, clearCall);
    return { ok: true };
  }
  if (session.approvedId) return { approvedId: session.approvedId }; // already finished (double tap)
  const approvedId = await saveApproved(session.program, session.note);
  await updateSession(id, (s, now) => finishSession(s, approvedId, now));
  return { approvedId };
});
