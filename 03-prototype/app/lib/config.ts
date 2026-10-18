// Paths and limits shared by the server code. Paths are relative to 03-prototype/,
// where `npm run dev` runs (process.cwd()). Next.js loads .env by itself.
import "server-only";

import path from "node:path";

const ROOT = process.cwd();

export const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(ROOT, "models", "ggml-large-v3-turbo-q5_0.bin");
// Voice activity detection: finds the speech between pauses, so Whisper doesn't skip sentences after one.
export const VAD_MODEL = process.env.WHISPER_VAD_MODEL || path.join(ROOT, "models", "ggml-silero-v5.1.2.bin");
export const EXAMPLES_DIR = path.join(ROOT, "..", "02-product", "examples");
export const OUTPUT_DIR = path.join(ROOT, "output");

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_JSON_BYTES = 1024 * 1024;
