// Shared by every speech-to-text engine (Whisper on this Mac, Azure, …). The API routes turn it
// into a 502 with the message shown to the physio (app/lib/http.ts).
export class TranscriptionError extends Error {}
