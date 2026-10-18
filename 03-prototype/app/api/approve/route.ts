// POST /api/approve  { program, note }
// The physio approved: save both to output/<id>.json and return the patient page link.
import * as z from "zod";

import { HttpError, handler, readJson } from "@/app/lib/http";
import { saveApproved } from "@/app/lib/programs";
import { ClinicalNote, PatientProgram } from "@/app/lib/schema";

const Approval = z.object({ program: PatientProgram, note: ClinicalNote });

export const POST = handler(async (request) => {
  const parsed = Approval.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, "The program or note has missing or invalid fields.");
  const id = await saveApproved(parsed.data.program, parsed.data.note);
  return { id, url: `/p/${id}` };
});
