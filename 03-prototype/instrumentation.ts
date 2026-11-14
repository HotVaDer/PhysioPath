// Runs once when the Next.js server starts: print setup hints and warm up Whisper (local speech only).
export async function register() {
  // Next.js also calls this for the Edge runtime; this block lets the bundler leave the Node.js code out there.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { existsSync } = await import("node:fs");
    const { VAD_MODEL, WHISPER_MODEL } = await import("@/app/lib/config");
    const { speechEngine, warmUpWhisper } = await import("@/app/lib/transcribe");

    if (!process.env.ANTHROPIC_API_KEY) console.log("! No ANTHROPIC_API_KEY in 03-prototype/.env yet: transcription works, program creation won't.");
    const engine = speechEngine();
    const label = { openai: "OpenAI gpt-transcribe (cloud)", azure: "Azure Speech (cloud, EU)", local: "Whisper on this Mac" }[engine];
    console.log(`Speech-to-text: ${label}  (SPEECH in .env)`);
    if (engine === "local" && (!existsSync(WHISPER_MODEL) || !existsSync(VAD_MODEL))) console.log("! Speech-to-text model missing. Run: npm run download-model");
    if (engine === "openai" && !process.env.OPENAI_API_KEY) console.log("! SPEECH=openai but OPENAI_API_KEY is missing in .env");
    if (engine === "azure" && (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION)) console.log("! SPEECH=azure but AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are missing in .env");
    void warmUpWhisper(); // not awaited: register() holds back the server until it returns
  }
}
