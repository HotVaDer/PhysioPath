// PhysioPath demo server.
// Run:  npm start   →   http://localhost:8766
// Listens on this Mac only and rejects requests coming from other websites.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { GenerationError, MODEL, generate } from "./generate.ts";
import { patientPage } from "./patientPage.ts";
import { PatientProgram } from "./schema.ts";
import { TranscriptionError, transcribe } from "./transcribe.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENV_FILE = join(ROOT, ".env");
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const PORT = Number(process.env.PORT || 8766);
const ORIGINS = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];
const WHISPER_MODEL = process.env.WHISPER_MODEL || join(ROOT, "models", "ggml-large-v3-turbo-q5_0.bin");
const EXAMPLES_DIR = join(ROOT, "..", "02-product", "examples");
const OUTPUT_DIR = join(ROOT, "output");
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: string | Buffer, type: string) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}
const json = (res: ServerResponse, status: number, data: unknown) =>
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, "The file is too large (max 25 MB).");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req: IncomingMessage) {
  try {
    return JSON.parse((await readBody(req, 1024 * 1024)).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}

// Same-machine only: block DNS rebinding (Host) and other websites (Origin).
function allowed(req: IncomingMessage): boolean {
  const host = req.headers.host ?? "";
  if (!ORIGINS.some((o) => o.endsWith("//" + host))) return false;
  const origin = req.headers.origin;
  return !origin || ORIGINS.includes(origin);
}

async function samples() {
  const files = (await readdir(EXAMPLES_DIR)).filter((f) => /^\d+-input\.txt$/.test(f)).sort();
  const list = [];
  for (const file of files) {
    const text = (await readFile(join(EXAMPLES_DIR, file), "utf8")).trim();
    if (!/[α-ωΑ-Ω]/.test(text)) continue; // Greek samples only
    list.push({ id: file.slice(0, 2), title: text.split(/[.,]/).slice(0, 2).join(",").trim(), text });
  }
  return list;
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const type = req.headers["content-type"] ?? "";

  if (req.method === "GET") {
    if (url.pathname === "/") return send(res, 200, await readFile(join(ROOT, "public", "index.html")), "text/html; charset=utf-8");
    if (url.pathname === "/api/status")
      return json(res, 200, { apiKey: Boolean(process.env.ANTHROPIC_API_KEY), whisper: existsSync(WHISPER_MODEL), model: MODEL });
    if (url.pathname === "/api/samples") return json(res, 200, await samples());
    const page = url.pathname.match(/^\/p\/([a-z0-9-]+)$/);
    if (page) {
      const file = join(OUTPUT_DIR, `${page[1]}.html`);
      if (existsSync(file)) return send(res, 200, await readFile(file), "text/html; charset=utf-8");
    }
    throw new HttpError(404, "Not found.");
  }

  if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");

  // Audio and JSON aren't "simple" CORS types, so other sites can't post them without a preflight we never answer.
  if (url.pathname === "/api/transcribe") {
    if (!type.startsWith("audio/") && !type.startsWith("video/") && type !== "application/octet-stream")
      throw new HttpError(415, "Send an audio file.");
    if (!existsSync(WHISPER_MODEL)) throw new HttpError(500, "The Whisper model isn't downloaded yet. Run: npm run download-model");
    const audio = await readBody(req, MAX_AUDIO_BYTES);
    if (!audio.length) throw new HttpError(400, "The recording is empty.");
    return json(res, 200, await transcribe(audio, WHISPER_MODEL));
  }

  if (!type.startsWith("application/json")) throw new HttpError(415, "Expected JSON.");
  const body = await readJson(req);

  if (url.pathname === "/api/generate") {
    return json(res, 200, await generate(String(body.transcript ?? ""), body.noteLang === "en" ? "en" : "el"));
  }

  if (url.pathname === "/api/approve") {
    const parsed = PatientProgram.safeParse(body.program);
    if (!parsed.success) throw new HttpError(400, "The program has missing or invalid fields.");
    const id = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(join(OUTPUT_DIR, `${id}.json`), JSON.stringify({ approvedAt: new Date().toISOString(), program: parsed.data, note: body.note }, null, 2));
    await writeFile(join(OUTPUT_DIR, `${id}.html`), patientPage(parsed.data, id, { clinicName: process.env.CLINIC_NAME }));
    return json(res, 200, { id, url: `/p/${id}` });
  }

  throw new HttpError(404, "Not found.");
}

const server = createServer(async (req, res) => {
  if (!allowed(req)) return json(res, 403, { error: "Forbidden." });
  try {
    await route(req, res);
  } catch (error) {
    if (error instanceof HttpError) return json(res, error.status, { error: error.message });
    if (error instanceof GenerationError || error instanceof TranscriptionError) return json(res, 502, { error: error.message });
    console.error(error);
    json(res, 500, { error: "Something went wrong. See the terminal for details." });
  }
});

// Whisper's first run on a fresh start is slow (the GPU code gets prepared), so do it once now
// with a second of silence instead of during the demo.
async function warmUpWhisper() {
  if (!existsSync(WHISPER_MODEL)) return;
  const wav = join(tmpdir(), `physiopath-warmup-${process.pid}.wav`);
  try {
    await promisify(execFile)("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "1", wav]);
    await transcribe(await readFile(wav), WHISPER_MODEL).catch(() => {}); // silence → "no speech", which is fine
  } catch {
    // Warm-up is only an optimisation.
  } finally {
    await rm(wav, { force: true });
  }
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`PhysioPath demo running at http://localhost:${PORT}  (Ctrl+C to stop)`);
  if (!process.env.ANTHROPIC_API_KEY) console.log("! No ANTHROPIC_API_KEY in 03-prototype/.env yet: transcription works, program creation won't.");
  if (!existsSync(WHISPER_MODEL)) console.log("! Whisper model missing. Run: npm run download-model");
  void warmUpWhisper();
});
