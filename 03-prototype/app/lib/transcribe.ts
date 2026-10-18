// Greek speech-to-text with whisper.cpp, running locally on the Mac's GPU.
// The audio never leaves this computer.
import "server-only";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { VAD_MODEL, WHISPER_MODEL } from "@/app/lib/config";

const run = promisify(execFile);

export class TranscriptionError extends Error {}

// Nudges spelling of the English clinical terms physios mix into Greek.
const PROMPT = "Σημειώσεις φυσιοθεραπευτή: ασκήσεις, σετ, επαναλήψεις, straight leg raises, squats, bridges.";

// Measured on noisy, phone-quality Greek notes with pauses (see docs/transcription.md):
// without these, Whisper sometimes skipped a whole sentence after a pause.
// --vad: transcribe only the speech, cut at the pauses. -mc 0: don't lean on the previous text,
// which is what makes Whisper jump ahead or repeat itself.
const ACCURACY_ARGS = () => (existsSync(VAD_MODEL) ? ["-mc", "0", "--vad", "-vm", VAD_MODEL] : ["-mc", "0"]);

// One transcription at a time; they share the GPU. The queue lives on globalThis because Next.js
// can load this module more than once (per route bundle, and again on every hot reload).
const shared = globalThis as typeof globalThis & { physiopathWhisperQueue?: Promise<unknown> };

export function transcribe(audio: Buffer) {
  const job = (shared.physiopathWhisperQueue ?? Promise.resolve()).then(() => transcribeNow(audio));
  shared.physiopathWhisperQueue = job.catch(() => {});
  return job;
}

async function transcribeNow(audio: Buffer) {
  const dir = await mkdtemp(join(tmpdir(), "physiopath-"));
  const started = performance.now();
  try {
    const input = join(dir, "input");
    const wav = join(dir, "audio.wav");
    await writeFile(input, audio);
    // whisper.cpp needs 16 kHz mono WAV; ffmpeg accepts whatever the browser recorded.
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", input, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]).catch(
      (e: Error) => { throw new TranscriptionError(`Couldn't read the audio file: ${e.message.split("\n").at(-2) ?? e.message}`); },
    );
    const { stdout } = await run(
      "whisper-cli",
      ["-m", WHISPER_MODEL, "-l", "el", "-f", wav, "--no-timestamps", "--no-prints", "--prompt", PROMPT, ...ACCURACY_ARGS()],
      { maxBuffer: 10 * 1024 * 1024 },
    ).catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") throw new TranscriptionError("whisper-cli isn't installed. Run: brew install whisper-cpp");
      throw new TranscriptionError(`Whisper failed: ${e.message}`);
    });
    const text = stdout.split("\n").map((line) => line.trim()).filter(Boolean).join(" ");
    if (!text) throw new TranscriptionError("No speech was recognised. Try recording again, a bit closer to the mic.");
    return { text, seconds: Math.round((performance.now() - started) / 100) / 10 };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Whisper's first run on a fresh start is slow (the GPU code gets prepared), so do it once at
// server start with a second of silence instead of during the demo.
export async function warmUpWhisper() {
  if (!existsSync(WHISPER_MODEL)) return;
  const wav = join(tmpdir(), `physiopath-warmup-${process.pid}.wav`);
  try {
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "1", wav]);
    await transcribe(await readFile(wav)).catch(() => {}); // silence → "no speech", which is fine
  } catch {
    // Warm-up is only an optimisation.
  } finally {
    await rm(wav, { force: true });
  }
}
