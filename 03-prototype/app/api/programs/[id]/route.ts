// GET /api/programs/<id>: one approved program for the patient page.
// Returns the program only; the clinical note stays with the clinic.
import { HttpError, handler } from "@/app/lib/http";
import { readPatientProgram } from "@/app/lib/programs";

export const GET = handler(async (_request, ctx: RouteContext<"/api/programs/[id]">) => {
  const program = await readPatientProgram((await ctx.params).id);
  if (!program) throw new HttpError(404, "Not found.");
  return program;
});
