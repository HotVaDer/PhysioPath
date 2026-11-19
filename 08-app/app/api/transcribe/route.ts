// POST /api/transcribe: the recording (raw audio in the body) → Greek text.
// Owner or physio only, within the AI limits (countAiCall). The audio goes to OpenAI for
// speech-to-text and is never stored; only the text comes back.
import { HttpError, countAiCall, readBody, requirePhysioApi, respond } from "@/app/lib/notes/http";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import { transcribeOpenAI } from "@/app/lib/notes/speech/openai";
import { TranscriptionError } from "@/app/lib/notes/speech/transcription-error";

// Speech-to-text can take up to a minute on a long note.
export const maxDuration = 120;

export async function POST(request: Request) {
  return respond(async () => {
    const { supabase } = await requirePhysioApi();
    const type = request.headers.get("content-type") ?? "";
    if (!/^(audio|video)\/|^application\/octet-stream/.test(type)) {
      throw new HttpError(415, "Αυτό δεν μοιάζει με αρχείο ήχου.");
    }
    const audio = await readBody(request, MAX_AUDIO_BYTES, AUDIO_TOO_LARGE);
    if (audio.byteLength === 0) throw new HttpError(400, "Η ηχογράφηση είναι κενή. Δοκιμάστε ξανά.");

    await countAiCall(supabase, "transcribe"); // only a valid recording is counted
    const heard = await transcribeOpenAI(audio);
    return { text: heard.text, seconds: heard.seconds };
  }, [TranscriptionError]);
}
