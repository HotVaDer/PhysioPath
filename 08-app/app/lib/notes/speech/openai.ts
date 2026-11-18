// Greek speech-to-text with OpenAI (gpt-transcribe): one upload, the text comes back.
// Best on Cypriot dialect in our test (2026-11-14, docs/transcription.md), helped by the hint below.
// The audio is processed by OpenAI (US). Fictional patients only until the privacy checklist is done
// (06-privacy-legal/checklist.md).
import "server-only";

import { TranscriptionError } from "@/app/lib/notes/speech/transcription-error";

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
  if (!key) {
    console.error("transcribe: OPENAI_API_KEY is not set");
    throw new TranscriptionError("Η εφαρμογή δεν είναι ρυθμισμένη ακόμα (λείπει το κλειδί για τη μετατροπή φωνής σε κείμενο).");
  }

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
    console.error("transcribe:", e.message);
    throw new TranscriptionError("Δεν απάντησε η υπηρεσία που γράφει τη φωνή σε κείμενο. Δοκιμάστε ξανά σε λίγο.");
  });

  if (!res.ok) {
    console.error(`transcribe: OpenAI ${res.status}`, (await res.text()).slice(0, 300));
    throw new TranscriptionError(openaiProblem(res.status));
  }

  const text = ((await res.json()) as { text?: string }).text?.trim();
  if (!text) throw new TranscriptionError("Δεν ακούστηκε ομιλία. Ηχογραφήστε ξανά, λίγο πιο κοντά στο μικρόφωνο.");
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

// Shown to the physio, so in Greek; the details are in the server log.
function openaiProblem(status: number) {
  if (status === 429) return "Πολλά αιτήματα αυτή τη στιγμή. Περιμένετε ένα λεπτό και δοκιμάστε ξανά.";
  if (status === 413) return "Η ηχογράφηση είναι πολύ μεγάλη.";
  return "Η μετατροπή φωνής σε κείμενο απέτυχε. Δοκιμάστε ξανά.";
}
