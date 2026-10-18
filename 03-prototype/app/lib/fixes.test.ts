import { describe, expect, it } from "vitest";

import { applyFixes, rejectReason, undoFix } from "@/app/lib/fixes";

const NOTE = "Έκανε την εχείρηση τώρα τελευταία, δεξιός όμως. Front level raises, 3 asset, 6 επαναλήψεις.";

describe("applyFixes", () => {
  it("applies fixes for words Whisper mis-heard", () => {
    const { text, applied } = applyFixes(NOTE, [
      { heard: "εχείρηση", corrected: "εγχείρηση" },
      { heard: "δεξιός όμως", corrected: "δεξιός ώμος" },
      { heard: "Front level raises", corrected: "Front lever raises" },
      { heard: "3 asset", corrected: "3 sets" },
    ]);
    expect(text).toBe("Έκανε την εγχείρηση τώρα τελευταία, δεξιός ώμος. Front lever raises, 3 sets, 6 επαναλήψεις.");
    expect(applied).toHaveLength(4);
  });

  it("never changes a number, whatever the proofreader says", () => {
    expect(rejectReason(NOTE, { heard: "3 asset", corrected: "4 sets" })).toBe("changes a number");
    expect(rejectReason(NOTE, { heard: "6 επαναλήψεις", corrected: "επαναλήψεις" })).toBe("changes a number");
    expect(applyFixes(NOTE, [{ heard: "3 asset", corrected: "4 sets" }]).text).toBe(NOTE);
  });

  it("never swaps left and right", () => {
    expect(rejectReason(NOTE, { heard: "δεξιός όμως", corrected: "αριστερός ώμος" })).toBe("changes left/right");
    expect(rejectReason("αριστερό γόνατο", { heard: "αριστερό", corrected: "δεξί" })).toBe("changes left/right");
  });

  it("skips fixes whose words aren't in the text, or that change nothing", () => {
    expect(rejectReason(NOTE, { heard: "Google Slides", corrected: "wall slides" })).toBe("not found in the text");
    expect(rejectReason(NOTE, { heard: "εχείρηση", corrected: "εχείρηση" })).toBe("empty or unchanged");
    expect(applyFixes(NOTE, [{ heard: "Google Slides", corrected: "wall slides" }]).applied).toEqual([]);
  });

  it("undo puts the heard words back", () => {
    const fix = { heard: "εχείρηση", corrected: "εγχείρηση" };
    const { text } = applyFixes(NOTE, [fix]);
    expect(undoFix(text, fix)).toBe(NOTE);
  });
});
