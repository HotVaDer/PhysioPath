// Speech-to-text: picks the engine from SPEECH in .env.
//   SPEECH=openai       → OpenAI gpt-transcribe (best on Cypriot dialect; what the online app uses)
//   SPEECH=azure        → Azure AI Speech (EU cloud; kept for comparison)
//   SPEECH=local / none → whisper.cpp on this Mac (audio never leaves it)
import "server-only";

import { transcribeAzure } from "@/app/lib/speech/azure";
import { transcribeOpenAI } from "@/app/lib/speech/openai";
import { transcribeWhisper, warmUpWhisper as warmUpLocal } from "@/app/lib/speech/whisper";

export { TranscriptionError } from "@/app/lib/speech/transcription-error";

export type SpeechEngine = "local" | "azure" | "openai";
export const speechEngine = (): SpeechEngine => {
  const choice = process.env.SPEECH;
  return choice === "azure" || choice === "openai" ? choice : "local";
};

export function transcribe(audio: Buffer, engine: SpeechEngine = speechEngine()) {
  if (engine === "openai") return transcribeOpenAI(audio);
  if (engine === "azure") return transcribeAzure(audio);
  return transcribeWhisper(audio);
}

// Only Whisper needs warming up at server start.
export async function warmUpWhisper() {
  if (speechEngine() === "local") await warmUpLocal();
}
