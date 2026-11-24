// Turns a voice-note transcript into the patient's program and the GeSY clinical note, with Claude.
// mode "note" («Ίδιο πρόγραμμα»): only the GeSY note and the questions; the stored program is never sent.
// mode "template": the template the physio picked (loaded by the route from the clinic's «Πρότυπα») goes
// with the transcript, and the program starts from it.
// mode "templates" («Πείτε τα πρότυπά σας»): several templates from one dictation; no patient, no note.
// mode "edit_template" («Αλλαγή με φωνή»): the template (loaded by the route) with only the changes said.
// Server only: this file uses the API key, which must never reach the browser.
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { systemPrompt, type GenerateMode, type NoteLanguage } from "@/app/lib/notes/prompt";
import {
  MAX_DICTATED_TEMPLATES,
  NoteOnlyResult,
  TemplateEditResult,
  TemplatesResult,
  VoiceNoteResult,
  type PatientProgram,
} from "@/app/lib/notes/schema";

export type TemplateInput = { name: string; program: PatientProgram };

// What Claude reads: the template (for mode "template") and the transcript.
export function userMessage(transcript: string, template?: TemplateInput): string {
  const said = `<transcript>\n${transcript}\n</transcript>`;
  return template ? `<template>\n${JSON.stringify({ name: template.name, program: template.program })}\n</template>\n${said}` : said;
}

export const MODEL = "claude-opus-5-5";

// The message is shown to the physio, so it is in Greek. Details go to the server log.
export class GenerationError extends Error {}

let client: Anthropic | undefined;

// What the AI wrote for «Πείτε τα πρότυπά σας», made safe to show: at most MAX_DICTATED_TEMPLATES, and never a
// patient (the prompt says so; this makes sure, and create_template clears them again).
export function tidyTemplates(result: TemplatesResult): TemplatesResult {
  const extra = result.templates.length > MAX_DICTATED_TEMPLATES;
  return {
    templates: result.templates.slice(0, MAX_DICTATED_TEMPLATES).map((t) => ({
      ...t,
      program: { ...t.program, patient_first_name: null, next_appointment: null },
    })),
    missing_or_unclear: extra
      ? [...result.missing_or_unclear, `Κρατήσαμε τα πρώτα ${MAX_DICTATED_TEMPLATES} πρότυπα. Πείτε τα υπόλοιπα σε νέα υπαγόρευση.`]
      : result.missing_or_unclear,
  };
}

// «Αλλαγή με φωνή»: never a patient (as tidyTemplates).
export function tidyEdit(result: TemplateEditResult): TemplateEditResult {
  return { ...result, program: { ...result.program, patient_first_name: null, next_appointment: null } };
}

const FORMATS = {
  program: VoiceNoteResult,
  template: VoiceNoteResult,
  note: NoteOnlyResult,
  templates: TemplatesResult,
  edit_template: TemplateEditResult,
} as const;

const usesTemplate = (mode: GenerateMode) => mode === "template" || mode === "edit_template";

export async function generate(transcript: string, noteLang: NoteLanguage, mode: GenerateMode = "program", template?: TemplateInput) {
  const text = transcript.trim();
  if (!text) throw new GenerationError("Το κείμενο είναι κενό. Ηχογραφήστε ή γράψτε τη σημείωση πρώτα.");
  if (usesTemplate(mode) && !template) throw new GenerationError("Το πρότυπο δεν βρέθηκε. Διαλέξτε άλλο ή συνεχίστε χωρίς πρότυπο.");
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("generate: ANTHROPIC_API_KEY is not set");
    throw new GenerationError("Η εφαρμογή δεν είναι ρυθμισμένη ακόμα (λείπει το κλειδί του Claude).");
  }
  // 50 s and one retry: the route has 120 s, so a slow answer ends with a clear message, not a timeout page.
  client ??= new Anthropic({ timeout: 50_000, maxRetries: 1 });

  const many = mode === "templates";
  const started = performance.now();
  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      // Ten templates in Greek are long: more room, and more time (in one try: the route has 120 s).
      max_tokens: many ? 32000 : 16000,
      output_config: {
        // Medium, not low: low changed exercises in 3 of 5 test notes (03-prototype/docs/transcription.md).
        effort: "medium",
        format: betaZodOutputFormat(FORMATS[mode]),
      },
      // If a safety classifier declines, retry server-side on Anthropic's recommended model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt(noteLang, mode),
      messages: [{ role: "user", content: userMessage(text, usesTemplate(mode) ? template : undefined) }],
    }, many ? { timeout: 110_000, maxRetries: 0 } : undefined);
  } catch (error) {
    console.error("generate:", error instanceof Error ? error.message : error);
    if (error instanceof Anthropic.RateLimitError)
      throw new GenerationError("Πολλά αιτήματα αυτή τη στιγμή. Περιμένετε ένα λεπτό και δοκιμάστε ξανά.");
    if (error instanceof Anthropic.APIConnectionError)
      throw new GenerationError("Δεν απάντησε η υπηρεσία που γράφει το πρόγραμμα. Δοκιμάστε ξανά σε λίγο.");
    if (error instanceof Anthropic.APIError)
      throw new GenerationError("Κάτι πήγε στραβά στη δημιουργία του προγράμματος. Δοκιμάστε ξανά.");
    throw error;
  }

  if (response.stop_reason === "refusal")
    throw new GenerationError("Η σημείωση δεν μπόρεσε να γραφτεί. Δοκιμάστε να την πείτε με άλλα λόγια.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output)
    throw new GenerationError("Η απάντηση κόπηκε ή δεν διαβάστηκε. Δοκιμάστε ξανά.");

  const parsed = response.parsed_output;
  return {
    result: many
      ? tidyTemplates(parsed as TemplatesResult)
      : mode === "edit_template"
        ? tidyEdit(parsed as TemplateEditResult)
        : parsed,
    seconds: Math.round((performance.now() - started) / 100) / 10,
  };
}
