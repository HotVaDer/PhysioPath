// The browser's side of app/api/transcribe and app/api/generate. Errors come back as ApiError with a
// Greek message that can be shown as is, also when Vercel answers with its own HTML page
// (413 for a too-large upload, 504 when a function runs out of time).
import { AUDIO_TOO_LARGE } from "@/app/lib/notes/limits";
import type { NoteLanguage } from "@/app/lib/notes/prompt";
import type { NoteOnlyResult, TemplateEditResult, TemplatesResult, VoiceNoteResult } from "@/app/lib/notes/schema";

export class ApiError extends Error {}

// text = what speech-to-text wrote; seconds = how long it took.
export type TranscribeResponse = { text: string; seconds: number };
export type GenerateResponse = { result: VoiceNoteResult; seconds: number };
export type GenerateNoteResponse = { result: NoteOnlyResult; seconds: number };
export type GenerateTemplatesResponse = { result: TemplatesResult; seconds: number };
export type EditTemplateResponse = { result: TemplateEditResult; seconds: number };

const STATUS_MESSAGES: Record<number, string> = {
  429: "Πολλά αιτήματα. Περιμένετε λίγο και δοκιμάστε ξανά.",
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

// templateId: start from this template of the clinic («Πρότυπα»); the server reads it itself.
export const generateProgram = (transcript: string, noteLang: NoteLanguage, templateId?: string | null) =>
  call<GenerateResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(templateId ? { transcript, noteLang, mode: "template", templateId } : { transcript, noteLang }),
  });

// «Ίδιο πρόγραμμα»: only today's GeSY note and the questions (the stored program stays as it is).
export const generateNote = (transcript: string, noteLang: NoteLanguage) =>
  call<GenerateNoteResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, noteLang, mode: "note" }),
  });

// «Πείτε τα πρότυπά σας»: several templates from one dictation (nothing saved; the physio checks each one).
export const generateTemplates = (transcript: string) =>
  call<GenerateTemplatesResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, mode: "templates" }),
  });

// «Αλλαγή με φωνή»: the clinic's template templateId (the server reads it) with only the changes said.
export const editTemplate = (transcript: string, templateId: string) =>
  call<EditTemplateResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, mode: "edit_template", templateId }),
  });
