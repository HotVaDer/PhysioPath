// POST /api/transcribe: the recording (raw audio in the body) → Greek text, proofread.
// Owner or physio only. The audio goes to OpenAI for speech-to-text and is never stored;
// only the text comes back.
import { HttpError, readBody, requirePhysioApi, respond } from "@/app/lib/notes/http";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import { proofread } from "@/app/lib/notes/proofread";
import { transcribeOpenAI } from "@/app/lib/notes/speech/openai";
import { TranscriptionError } from "@/app/lib/notes/speech/transcription-error";

// Speech-to-text can take up to a minute on a long note, then proofreading a few seconds.
export const maxDuration = 120;

export async function POST(request: Request) {
  return respond(async () => {
    await requirePhysioApi();
    const type = request.headers.get("content-type") ?? "";
    if (!/^(audio|video)\/|^application\/octet-stream/.test(type)) {
      throw new HttpError(415, "Αυτό δεν μοιάζει με αρχείο ήχου.");
    }
    const audio = await readBody(request, MAX_AUDIO_BYTES, AUDIO_TOO_LARGE);
    if (audio.byteLength === 0) throw new HttpError(400, "Η ηχογράφηση είναι κενή. Δοκιμάστε ξανά.");

    const heard = await transcribeOpenAI(audio);
    const checked = await proofread(heard.text);
    return { text: checked.text, raw: heard.text, fixes: checked.fixes, seconds: heard.seconds, proofreadSeconds: checked.seconds };
  }, [TranscriptionError]);
}
