// Runs once when the Next.js server starts: print setup hints and warm up Whisper.
export async function register() {
  // Next.js also calls this for the Edge runtime; this block lets the bundler leave the Node.js code out there.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { existsSync } = await import("node:fs");
    const { VAD_MODEL, WHISPER_MODEL } = await import("@/app/lib/config");
    const { warmUpWhisper } = await import("@/app/lib/transcribe");

    if (!process.env.ANTHROPIC_API_KEY) console.log("! No ANTHROPIC_API_KEY in 03-prototype/.env yet: transcription works, program creation won't.");
    if (!existsSync(WHISPER_MODEL) || !existsSync(VAD_MODEL)) console.log("! Speech-to-text model missing. Run: npm run download-model");
    void warmUpWhisper(); // not awaited: register() holds back the server until it returns
  }
}
