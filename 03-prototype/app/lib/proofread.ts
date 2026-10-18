// Proofreads Whisper's transcript before the physio sees it. Whisper writes the sounds it hears, so it
// sometimes produces words that don't exist ("εχείρηση") or don't fit ("Front Level Rose"). A small, fast
// Claude reads the text and returns only a list of word fixes; the app applies them itself (fixes.ts),
// with hard checks that no number or side ever changes. Only text is sent, never audio.
// Any failure (no key, no internet, a timeout) returns Whisper's text unchanged: proofreading never blocks.
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod";

import { Fix, applyFixes } from "@/app/lib/fixes";

// The smallest Claude: about 0.02 cents per note, so proofreading every recording costs next to nothing.
export const PROOFREAD_MODEL = "claude-haiku-5-5";

const Result = z.object({ fixes: z.array(Fix) });

const SYSTEM_PROMPT = `You proofread automatic speech-to-text transcripts of voice notes by Greek-speaking physiotherapists in Cyprus and Greece.

The speech-to-text writes the sounds it hears, so it sometimes produces words that do not exist or do not fit, for example "εχείρηση" for "εγχείρηση", "όμως" for "ώμος" after a body part, "διεξήν" for "δεξί", or English exercise terms spelled by sound ("Front Level Rose" for "front lever rows", "3 asset" for "3 sets"). Physios mix English clinical and exercise terms into Greek; keep those terms in English.

Read for meaning, not word by word. First work out what the note says: the patient, the body part and side, what happened (surgery, injury, pain), the treatment and each exercise. Then read every sentence again and ask whether each word makes sense there. The speech-to-text often writes a real Greek word that sounds like the right one but makes no sense in the sentence. That word is a mis-hearing too, even though it exists. Example: "έχει χειρίσει δεξιός όμως" makes no sense; the physio said "έχει εγχείριση, δεξιός ώμος" (χειρίσει and όμως are real words, but not here).

Return only the fixes for words that are clearly mis-heard: words that do not exist, or a real word that does not fit the meaning of its sentence. For each fix, "heard" must be copied exactly from the transcript (1-5 words, enough to find the right place) and "corrected" is what the physio most likely said.

English terms written in Greek letters: the speech-to-text often spells an English clinical or exercise term by its sound in Greek letters, which is not a Greek word. Correct it to the English term in Latin letters, never to a Greek translation or a Greek spelling. Examples: "αισομέτρικ" or "Αισυμέτρικ" → "isometric" (not "ισομετρική"), "σκουότ" → "squat", "μπρίτζες" → "bridges", "γουολ σλάιντς" → "wall slides", "πέντουλουμ" → "pendulum", "κλάμσελς" → "clamshells". Use the context to pick the right term (for example "isometric" for a hold against a wall, not "asymmetric"). If the physio said a real Greek word ("ισομετρική άσκηση", "βαθύ κάθισμα"), it is correct: leave it in Greek. English terms already in Latin letters can be mis-heard too: fix every occurrence ("front level raises" → "front lever raises").

Rules:
- Never change numbers, amounts, durations, frequencies or doses.
- Never change left/right, a body part or an exercise into a different real one.
- Never add or remove information, and never reword, shorten or reorder anything.
- Cypriot dialect words and informal speech are correct: leave them.
- Do not fix punctuation, capital letters or style.
- If you are not sure, leave the word as it is: a wrong fix is worse than none.
- No fixes needed: return an empty list.`;

let client: Anthropic | undefined;

export async function proofread(text: string) {
  const started = performance.now();
  const unchanged = { text, fixes: [] as Fix[], seconds: 0, proofread: false };
  if (!text.trim() || !process.env.ANTHROPIC_API_KEY) return unchanged;
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse(
      {
        model: PROOFREAD_MODEL,
        max_tokens: 2000,
        // medium, not low: spotting a real word that doesn't fit its sentence needs a little thought
        // (in tests, low once turned "αγώνα" into "γόνατα" instead of "αγκώνα"; medium adds ~0.5 s)
        output_config: { effort: "medium", format: betaZodOutputFormat(Result) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `<transcript>\n${text}\n</transcript>` }],
      },
      { timeout: 15_000, maxRetries: 1 },
    );
    if (response.stop_reason !== "end_turn" || !response.parsed_output) return unchanged;
    const { text: corrected, applied } = applyFixes(text, response.parsed_output.fixes);
    return { text: corrected, fixes: applied, seconds: Math.round((performance.now() - started) / 100) / 10, proofread: true };
  } catch (error) {
    console.error("Proofreading skipped:", error instanceof Error ? error.message : error);
    return unchanged;
  }
}
