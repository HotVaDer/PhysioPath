// The browser's side of the API routes in app/api/: one typed function per endpoint.
// Errors come back as ApiError with a message that can be shown to the physio as-is.
import type { Fix } from "@/app/lib/fixes";
import type { generate } from "@/app/lib/generate";
import type { NoteLanguage } from "@/app/lib/prompt";
import type { ClinicalNote, PatientProgram } from "@/app/lib/schema";
import type { PatientAction, PatientSessionView, Session } from "@/app/lib/session";

export class ApiError extends Error {}

// text = after proofreading; raw = what Whisper wrote; fixes = what changed between them (for undo).
export type TranscribeResponse = { text: string; raw: string; fixes: Fix[]; seconds: number; proofreadSeconds: number };
export type GenerateResponse = Awaited<ReturnType<typeof generate>>;
export type ApproveResponse = { id: string; url: string };

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError("Δεν ήταν δυνατή η σύνδεση με τον server. Τρέχει ακόμα το npm run dev;");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? `Κάτι πήγε στραβά (${response.status}).`);
  return data as T;
}

const postJson = <T>(path: string, body: unknown) =>
  call<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function transcribeAudio(audio: Blob): Promise<TranscribeResponse> {
  // "audio/webm;codecs=opus" → "audio/webm": the server checks the main type only.
  const type = (audio.type || "application/octet-stream").split(";")[0];
  return call("/api/transcribe", { method: "POST", headers: { "Content-Type": type }, body: audio });
}

export const generateProgram = (transcript: string, noteLang: NoteLanguage) =>
  postJson<GenerateResponse>("/api/generate", { transcript, noteLang });

export const approveProgram = (program: PatientProgram, note: ClinicalNote) => postJson<ApproveResponse>("/api/approve", { program, note });

// ---- Session mode ----
export type StartSessionResponse = { id: string; url: string; reachableFromPhones: boolean };
export type SessionsResponse = { sessions: Session[]; now: string };

export const startSessionRequest = (program: PatientProgram, note: ClinicalNote) =>
  postJson<StartSessionResponse>("/api/sessions", { program, note });

export const listSessionsRequest = () => call<SessionsResponse>("/api/sessions", { cache: "no-store" });

export const physioAction = (id: string, type: "clearCall" | "finish") =>
  postJson<{ ok?: true; approvedId?: string }>(`/api/sessions/${id}/physio`, { type });

// The patient's screen (may run on a phone on the Wi-Fi).
export const getPatientSession = (id: string) => call<PatientSessionView>(`/api/sessions/${id}`, { cache: "no-store" });

export const sendPatientAction = (id: string, action: PatientAction) => postJson<PatientSessionView>(`/api/sessions/${id}/events`, action);
