// Turn a voice-note transcript into a patient program and clinical note with Claude.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { systemPrompt, type NoteLanguage } from "./prompt.ts";
import { VoiceNoteResult } from "./schema.ts";

export const MODEL = "claude-opus-5-5";

export class GenerationError extends Error {}

let client: Anthropic | undefined;

export async function generate(transcript: string, noteLang: NoteLanguage) {
  const text = transcript.trim();
  if (!text) throw new GenerationError("The transcript is empty.");
  if (!process.env.ANTHROPIC_API_KEY)
    throw new GenerationError("No Claude API key yet. Paste it into ANTHROPIC_API_KEY in 03-prototype/.env, then restart the demo.");
  client ??= new Anthropic();

  const started = performance.now();
  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        // Reformatting a short note doesn't need deep reasoning; medium keeps it fast.
        effort: "medium",
        format: betaZodOutputFormat(VoiceNoteResult),
      },
      // If a safety classifier declines, retry server-side on Anthropic's recommended model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt(noteLang),
      messages: [{ role: "user", content: `<transcript>\n${text}\n</transcript>` }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      throw new GenerationError("The Claude API key is missing or wrong. Check ANTHROPIC_API_KEY in 03-prototype/.env.");
    if (error instanceof Anthropic.RateLimitError)
      throw new GenerationError("Too many requests to Claude right now. Wait a minute and try again.");
    if (error instanceof Anthropic.APIConnectionError)
      throw new GenerationError("Couldn't reach the Claude API. Check your internet connection.");
    if (error instanceof Anthropic.APIError)
      throw new GenerationError(`Claude API error (${error.status}): ${error.message}`);
    throw error;
  }

  if (response.stop_reason === "refusal")
    throw new GenerationError("Claude declined this request. Try rephrasing the note.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output)
    throw new GenerationError("Claude's answer was cut off or couldn't be read. Try again.");

  return {
    result: response.parsed_output,
    seconds: Math.round((performance.now() - started) / 100) / 10,
    model: response.model,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
  };
}
