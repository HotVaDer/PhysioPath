// POST /api/generate: { transcript, noteLang, mode } → the patient program, the GeSY note and the questions
// for the physio (mode "note", «Ίδιο πρόγραμμα»: only the note and the questions). Owner or physio only. Nothing is saved here: the physio reviews and approves first.
import * as z from "zod";

import { GenerationError, generate } from "@/app/lib/notes/generate";
import { HttpError, readBody, requirePhysioApi, respond } from "@/app/lib/notes/http";
import { GenerateMode, NoteLanguage } from "@/app/lib/notes/prompt";

// Claude takes about 20 s with effort medium; generate.ts gives up at 50 s plus one retry.
export const maxDuration = 120;

const Body = z.object({
  transcript: z.string().trim().min(1, "Το κείμενο είναι κενό.").max(20_000, "Το κείμενο είναι πολύ μεγάλο."),
  noteLang: NoteLanguage.catch("el"),
  mode: GenerateMode.catch("program"),
});

export async function POST(request: Request) {
  return respond(async () => {
    await requirePhysioApi();
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Λάθος αίτημα.");
    let data: unknown;
    try {
      data = JSON.parse((await readBody(request, 100_000, "Το κείμενο είναι πολύ μεγάλο.")).toString("utf8"));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "Λάθος αίτημα.");
    }
    const body = Body.safeParse(data);
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message ?? "Λάθος αίτημα.");
    return generate(body.data.transcript, body.data.noteLang, body.data.mode);
  }, [GenerationError]);
}
