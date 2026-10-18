// POST /api/sessions  { program, note }: the physio starts a patient's session (this Mac only).
// GET  /api/sessions: every session in the room, for the room board (this Mac only).
import * as z from "zod";

import { HttpError, handler, readJson } from "@/app/lib/http";
import { patientUrl } from "@/app/lib/lan";
import { ClinicalNote, PatientProgram } from "@/app/lib/schema";
import { createSession, listSessions } from "@/app/lib/sessions";

const Start = z.object({ program: PatientProgram, note: ClinicalNote });

export const POST = handler(async (request) => {
  const parsed = Start.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, "The program or note has missing or invalid fields.");
  if (!parsed.data.program.exercises.some((e) => e.name.trim())) throw new HttpError(400, "Add at least one exercise first.");
  const session = await createSession(parsed.data.program, parsed.data.note);
  return { id: session.id, ...patientUrl(session.id) };
});

export const GET = handler(async () => ({ sessions: listSessions(), now: new Date().toISOString() }));
