// Applies the proofreader's word fixes to a transcript (see proofread.ts), with hard safety checks in code:
// the proofreader is told the same rules, but a patient's dose or side must never depend on it obeying.
// Pure functions, no React or server code, so they are easy to test.
import * as z from "zod";

export const Fix = z.object({
  heard: z.string().describe("The words exactly as they appear in the transcript, 1-5 words, enough to find them."),
  corrected: z.string().describe("What the physio most likely said, to put in their place."),
});
export type Fix = z.infer<typeof Fix>;

const digits = (text: string) => text.replace(/\D/g, "");

// Which side a phrase names, if any. "Δεξ" / "αριστερ" cover δεξί, δεξιός, δεξιά, αριστερό, αριστερή…
function side(text: string): "left" | "right" | null {
  const plain = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const left = /αριστερ|\bleft\b/.test(plain);
  const right = /δεξ|\bright\b/.test(plain);
  return left === right ? null : left ? "left" : "right";
}

// Why a fix is refused, or null when it is safe to apply.
export function rejectReason(text: string, fix: Fix): string | null {
  const heard = fix.heard.trim();
  const corrected = fix.corrected.trim();
  if (!heard || !corrected || heard === corrected) return "empty or unchanged";
  if (!text.includes(heard)) return "not found in the text";
  if (digits(heard) !== digits(corrected)) return "changes a number";
  const before = side(heard);
  if (before && side(corrected) !== before) return "changes left/right";
  return null;
}

// Applies every safe fix (all occurrences of its words) and returns the fixes that were applied.
export function applyFixes(text: string, fixes: Fix[]): { text: string; applied: Fix[] } {
  const applied: Fix[] = [];
  let result = text;
  for (const fix of fixes) {
    if (rejectReason(result, fix)) continue;
    const clean = { heard: fix.heard.trim(), corrected: fix.corrected.trim() };
    result = result.replaceAll(clean.heard, clean.corrected);
    applied.push(clean);
  }
  return { text: result, applied };
}

// Puts the heard words back (the physio pressed "Αναίρεση").
export const undoFix = (text: string, fix: Fix) => text.replaceAll(fix.corrected, fix.heard);
