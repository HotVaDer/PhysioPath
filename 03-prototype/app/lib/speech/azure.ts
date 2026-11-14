// Greek speech-to-text with Azure AI Speech "fast transcription": one upload, the text comes back.
// The audio goes to the Speech resource in AZURE_SPEECH_REGION (France Central, EU).
// Fictional patients only until the privacy checklist is done (06-privacy-legal/checklist.md).
import "server-only";

import { TranscriptionError } from "@/app/lib/speech/transcription-error";

// 2025-10-15 is the first version that accepts a phrase list (checked 2026-11-14).
const API_VERSION = "2025-10-15";

// English clinical terms physios mix into Greek. A hint only; the proofreader fixes the rest.
const PHRASES = ["squats", "lunges", "bridge", "plank", "pendulum", "wall slides", "straight leg raises", "step ups", "cat camel"];

export async function transcribeAzure(audio: Buffer) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new TranscriptionError("Azure Speech isn't set up: add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to .env");

  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)]), "note"); // any browser format (webm, m4a, ogg…)
  form.append(
    "definition",
    JSON.stringify({
      locales: ["el-GR"],
      profanityFilterMode: "None", // never mask a word as ***
      phraseList: { phrases: PHRASES },
    }),
  );

  const started = performance.now();
  const url = `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": key },
    body: form,
    signal: AbortSignal.timeout(60_000),
  }).catch((e: Error) => {
    throw new TranscriptionError(`Couldn't reach Azure Speech: ${e.message}`);
  });

  if (!res.ok) throw new TranscriptionError(azureProblem(res.status, await res.text()));

  const data = (await res.json()) as { combinedPhrases?: { text: string }[] };
  const text = (data.combinedPhrases ?? []).map((p) => p.text).join(" ").trim();
  if (!text) throw new TranscriptionError("No speech was recognised. Try recording again, a bit closer to the mic.");
  return { text, seconds: Math.round((performance.now() - started) / 100) / 10 };
}

// Plain explanations for the errors you are likely to hit.
function azureProblem(status: number, body: string) {
  if (status === 401) return "Azure Speech refused the key. Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.";
  if (status === 429) return "Azure Speech is busy or the free 5 hours this month are used up. Try again in a minute.";
  if (status === 413) return "The recording is too long for Azure Speech.";
  return `Azure Speech failed (${status}): ${body.slice(0, 200)}`;
}
