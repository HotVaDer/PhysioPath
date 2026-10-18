// POST /api/generate  { transcript, noteLang }
// Sends the (possibly edited) transcript to Claude and returns the program, note and questions.
// Only the text leaves this Mac, never the audio.
import { generate } from "@/app/lib/generate";
import { handler, readJson } from "@/app/lib/http";
import { NoteLanguage } from "@/app/lib/prompt";

export const POST = handler(async (request) => {
  const body = await readJson(request);
  return generate(String(body.transcript ?? ""), NoteLanguage.catch("el").parse(body.noteLang));
});
