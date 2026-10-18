// Security and plumbing shared by every API route in app/api/.
// Same rules as the old src/server.ts: same machine only, size limits, JSON errors. The one exception:
// patient session routes ({ lan: true }) also accept this Mac's own Wi-Fi address in same-Wi-Fi mode.
// This runs inside each route rather than in proxy.ts, because the proxy buffers request
// bodies and cuts them at 10 MB, which would break 25 MB audio uploads.
import "server-only";

import { MAX_JSON_BYTES } from "@/app/lib/config";
import { GenerationError } from "@/app/lib/generate";
import { hostAllowed, lanAddresses, lanEnabled } from "@/app/lib/lan";
import { TranscriptionError } from "@/app/lib/transcribe";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Same machine only (see hostAllowed in lan.ts): blocks DNS rebinding (Host) and other websites (Origin).
// Audio and JSON aren't "simple" CORS types, so other sites can't post them without a preflight we never answer.
function isAllowed(request: Request, patientRoute: boolean): boolean {
  const lan = patientRoute && lanEnabled();
  return hostAllowed(request.headers.get("host") ?? "", request.headers.get("origin"), {
    patientRoute,
    lan,
    addresses: lan ? lanAddresses() : [],
  });
}

const json = (status: number, data: unknown) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

// Reads the body but stops as soon as it passes the limit, so a huge upload is never held in memory.
export async function readBody(request: Request, limit: number): Promise<Buffer> {
  const tooLarge = () => new HttpError(413, `The upload is too large (max ${limit / 1024 / 1024} MB).`);
  if (Number(request.headers.get("content-length")) > limit) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Expected JSON.");
  const body = await readBody(request, MAX_JSON_BYTES);
  let data: unknown;
  try {
    data = JSON.parse(body.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new HttpError(400, "Invalid request.");
  return data as Record<string, unknown>;
}

// Wraps a route: checks where the request comes from, sends the result as JSON, and turns errors into
// { error } with the right status. Known errors carry a message the physio can act on.
// { lan: true } only for patient session routes: they may also come from a phone on the Wi-Fi.
export function handler<Context>(fn: (request: Request, context: Context) => Promise<unknown>, { lan = false } = {}) {
  return async (request: Request, context: Context): Promise<Response> => {
    if (!isAllowed(request, lan)) return json(403, { error: "Forbidden." });
    try {
      return json(200, await fn(request, context));
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      if (error instanceof GenerationError || error instanceof TranscriptionError) return json(502, { error: error.message });
      console.error(error);
      return json(500, { error: "Something went wrong. See the terminal for details." });
    }
  };
}
