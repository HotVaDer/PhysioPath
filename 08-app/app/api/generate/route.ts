// POST /api/generate: { transcript, noteLang, mode, templateId } → the patient program, the GeSY note and the
// questions for the physio (mode "note", «Ίδιο πρόγραμμα»: only the note and the questions; mode "template":
// the program starts from the clinic's template templateId; mode "templates", «Πείτε τα πρότυπά σας»: several
// templates from one dictation, no patient and no note). Owner or physio only. Nothing is saved here:
// the physio reviews and approves (or saves each template) first. Every mode is one counted Claude call.
// The template is read here with the physio's own login, so only a template of the open clinic, not
// archived, can be used: the browser sends its id, never its contents.
import * as z from "zod";

import { GenerationError, generate, type TemplateInput } from "@/app/lib/notes/generate";
import { HttpError, countAiCall, readBody, requirePhysioApi, respond } from "@/app/lib/notes/http";
import { GenerateMode, NoteLanguage } from "@/app/lib/notes/prompt";
import { readProgram } from "@/app/lib/notes/schema";
import type { Supabase } from "@/app/lib/supabase/server";

// Claude takes about 20 s with effort medium; generate.ts gives up at 50 s plus one retry (templates: 110 s, once;
// ten templates took 27 s in the test of 2026-11-24).
export const maxDuration = 120;

const Body = z.object({
  transcript: z.string().trim().min(1, "Το κείμενο είναι κενό.").max(20_000, "Το κείμενο είναι πολύ μεγάλο."),
  noteLang: NoteLanguage.catch("el"),
  mode: GenerateMode.catch("program"),
  templateId: z.uuid().optional().catch(undefined),
});

const TEMPLATE_GONE = "Το πρότυπο δεν βρέθηκε (ίσως αρχειοθετήθηκε). Διαλέξτε άλλο ή συνεχίστε χωρίς πρότυπο.";

// RLS: owners and physios see their open clinic's templates only.
async function loadTemplate(supabase: Supabase, id: string): Promise<TemplateInput> {
  const { data } = await supabase.from("templates").select("name, program").eq("id", id).is("archived_at", null).maybeSingle();
  const program = data ? readProgram(data.program) : null;
  if (!data || !program) throw new HttpError(404, TEMPLATE_GONE);
  return { name: data.name as string, program };
}

export async function POST(request: Request) {
  return respond(async () => {
    const { supabase } = await requirePhysioApi();
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
    const { transcript, noteLang, mode, templateId } = body.data;
    if (mode === "template" && !templateId) throw new HttpError(400, TEMPLATE_GONE);
    const template = mode === "template" ? await loadTemplate(supabase, templateId!) : undefined;
    await countAiCall(supabase, "generate"); // only a valid request is counted
    return generate(transcript, noteLang, mode, template);
  }, [GenerationError]);
}
