// The browser's side of app/api/transcribe and app/api/generate. Errors come back as ApiError with a
// Greek message that can be shown as is, also when Vercel answers with its own HTML page
// (413 for a too-large upload, 504 when a function runs out of time).
import type { Fix } from "@/app/lib/notes/fixes";
import { AUDIO_TOO_LARGE } from "@/app/lib/notes/limits";
import type { NoteLanguage } from "@/app/lib/notes/prompt";
import type { NoteOnlyResult, VoiceNoteResult } from "@/app/lib/notes/schema";

export class ApiError extends Error {}

// text = after proofreading; raw = what speech-to-text wrote; fixes = what changed between them (for undo).
export type TranscribeResponse = { text: string; raw: string; fixes: Fix[]; seconds: number; proofreadSeconds: number };
export type GenerateResponse = { result: VoiceNoteResult; seconds: number };
export type GenerateNoteResponse = { result: NoteOnlyResult; seconds: number };

const STATUS_MESSAGES: Record<number, string> = {
  401: "Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.",
  403: "Μόνο οι φυσιοθεραπευτές γράφουν σημειώσεις.",
  413: AUDIO_TOO_LARGE,
  504: "Η απάντηση άργησε πολύ. Δοκιμάστε ξανά.",
};

export async function call<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError("Δεν υπάρχει σύνδεση στο διαδίκτυο. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.");
  }
  const text = await response.text();
  let data: { error?: string } | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null; // not JSON: an error page from Vercel or a proxy
  }
  if (!response.ok) {
    throw new ApiError(data?.error ?? STATUS_MESSAGES[response.status] ?? `Κάτι πήγε στραβά (${response.status}). Δοκιμάστε ξανά.`);
  }
  if (data === null) throw new ApiError("Η απάντηση δεν διαβάστηκε. Δοκιμάστε ξανά.");
  return data as T;
}

// The server checks the main type only: "audio/webm;codecs=opus" → "audio/webm".
export function transcribeAudio(audio: Blob): Promise<TranscribeResponse> {
  const type = (audio.type || "application/octet-stream").split(";")[0];
  return call("/api/transcribe", { method: "POST", headers: { "Content-Type": type }, body: audio });
}

export const generateProgram = (transcript: string, noteLang: NoteLanguage) =>
  call<GenerateResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, noteLang }),
  });

// «Ίδιο πρόγραμμα»: only today's GeSY note and the questions (the stored program stays as it is).
export const generateNote = (transcript: string, noteLang: NoteLanguage) =>
  call<GenerateNoteResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, noteLang, mode: "note" }),
  });
