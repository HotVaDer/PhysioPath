// POST /api/transcribe  (body: the recorded or uploaded audio file)
// Turns the voice note into Greek text with Whisper, on this Mac, then has a small Claude proofread it
// (only the text is sent), so the physio sees corrected words. Returns Whisper's original too, for undo.
import { existsSync } from "node:fs";

import { MAX_AUDIO_BYTES, WHISPER_MODEL } from "@/app/lib/config";
import type { TranscribeResponse } from "@/app/lib/api";
import { HttpError, handler, readBody } from "@/app/lib/http";
import { proofread } from "@/app/lib/proofread";
import { transcribe } from "@/app/lib/transcribe";

const AUDIO_TYPE = /^(audio|video)\/|^application\/octet-stream/;

export const POST = handler(async (request) => {
  if (!AUDIO_TYPE.test(request.headers.get("content-type") ?? "")) throw new HttpError(415, "Send an audio file.");
  if (!existsSync(WHISPER_MODEL)) throw new HttpError(500, "The Whisper model isn't downloaded yet. Run: npm run download-model");
  const audio = await readBody(request, MAX_AUDIO_BYTES);
  if (!audio.length) throw new HttpError(400, "The recording is empty.");
  const heard = await transcribe(audio);
  const checked = await proofread(heard.text);
  const response: TranscribeResponse = { text: checked.text, raw: heard.text, fixes: checked.fixes, seconds: heard.seconds, proofreadSeconds: checked.seconds };
  return response;
});
