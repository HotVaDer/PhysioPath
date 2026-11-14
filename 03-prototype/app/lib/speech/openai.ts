// Greek speech-to-text with OpenAI (gpt-transcribe): one upload, the text comes back.
// Best on Cypriot dialect in our test (2026-11-14, docs/transcription.md), helped by the hint below.
// The audio is processed by OpenAI (US). Fictional patients only until the privacy checklist is done
// (06-privacy-legal/checklist.md).
import "server-only";

import { TranscriptionError } from "@/app/lib/speech/transcription-error";

const MODEL = process.env.OPENAI_SPEECH_MODEL || "gpt-transcribe";

// Tells the model what it will hear: Cypriot words and the English terms physios mix in.
// It only steers spelling; it can't add words that weren't said.
const HINT =
  "Σημειώσεις φυσιοθεραπευτή στην κυπριακή διάλεκτο. Λέξεις: όι (όχι), δκυο (δύο), τζιαι (και), εν (είναι), " +
  "που (από), κάμνει, εκάμαμε, πρηστεί, μεν (μην), σέριν (χέρι), κελλέν (κεφάλι). " +
  "Θεραπεία: μάλαξη, κινητοποίηση, διατάσεις, ηλεκτροθεραπεία, dry needling. Ασκήσεις: external rotation, wall slides, stretch, squats, lunges, " +
  "bridge, plank, pendulum, straight leg raises.";

export async function transcribeOpenAI(audio: Buffer) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new TranscriptionError("OpenAI isn't set up: add OPENAI_API_KEY to .env");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), `note.${audioExtension(audio)}`);
  form.append("model", MODEL);
  form.append("language", "el");
  form.append("prompt", HINT);

  const started = performance.now();
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  }).catch((e: Error) => {
    throw new TranscriptionError(`Couldn't reach OpenAI: ${e.message}`);
  });

  if (!res.ok) throw new TranscriptionError(openaiProblem(res.status, await res.text()));

  const text = ((await res.json()) as { text?: string }).text?.trim();
  if (!text) throw new TranscriptionError("No speech was recognised. Try recording again, a bit closer to the mic.");
  return { text, seconds: Math.round((performance.now() - started) / 100) / 10 };
}

// OpenAI reads the format from the file name, so name it after the first bytes:
// browsers record webm (Chrome) or mp4/m4a (Safari, iPhone); uploads can be anything.
function audioExtension(audio: Buffer) {
  const ascii = (start: number, end: number) => audio.subarray(start, end).toString("latin1");
  if (audio[0] === 0x1a && audio[1] === 0x45 && audio[2] === 0xdf && audio[3] === 0xa3) return "webm";
  if (ascii(4, 8) === "ftyp") return "m4a";
  if (ascii(0, 4) === "OggS") return "ogg";
  if (ascii(0, 4) === "RIFF") return "wav";
  if (ascii(0, 4) === "fLaC") return "flac";
  if (ascii(0, 3) === "ID3" || (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)) return "mp3";
  return "webm";
}

function openaiProblem(status: number, body: string) {
  if (status === 401) return "OpenAI refused the key. Check OPENAI_API_KEY in .env.";
  if (status === 429) return "OpenAI is busy or the credit has run out (platform.openai.com → Billing). Try again in a minute.";
  if (status === 413) return "The recording is too long for OpenAI (25 MB maximum).";
  return `OpenAI failed (${status}): ${body.slice(0, 200)}`;
}
