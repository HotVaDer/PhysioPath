// Greek speech-to-text with whisper.cpp, running locally on the Mac's GPU.
// The audio never leaves this computer.
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export class TranscriptionError extends Error {}

// Nudges spelling of the English clinical terms physios mix into Greek.
const PROMPT = "Σημειώσεις φυσιοθεραπευτή: ασκήσεις, σετ, επαναλήψεις, straight leg raises, squats, bridges.";

let queue: Promise<unknown> = Promise.resolve(); // one transcription at a time; they share the GPU

export function transcribe(audio: Buffer, modelPath: string) {
  const job = queue.then(() => transcribeNow(audio, modelPath));
  queue = job.catch(() => {});
  return job;
}

async function transcribeNow(audio: Buffer, modelPath: string) {
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
      ["-m", modelPath, "-l", "el", "-f", wav, "--no-timestamps", "--no-prints", "--prompt", PROMPT],
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
