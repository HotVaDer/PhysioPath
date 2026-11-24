// aiRefusal: how the database's AI limits (public.use_ai) reach the physio.
// The counting itself is tested against the real database in supabase/checks/rls_check.sql.
import { describe, expect, it } from "vitest";

import { aiRefusal } from "@/app/lib/notes/ai-limits";

describe("aiRefusal", () => {
  it.each([
    ["too fast", "Πολλά αιτήματα μέσα σε ένα λεπτό"],
    ["daily limit", "Η κλινική έφτασε το όριο για σήμερα"],
    ["app limit", "Η υπηρεσία έφτασε το όριο για σήμερα"],
    ["demo limit", "Η δοκιμή έφτασε το όριό της (5 ηχογραφήσεις και 5 προγράμματα)"],
  ])("a limit (%s) becomes 429 with a Greek message", (reason, text) => {
    const refusal = aiRefusal(reason);
    expect(refusal?.status).toBe(429);
    expect(refusal?.message).toContain(text);
  });

  it("an assistant gets 403", () => {
    expect(aiRefusal("not allowed")?.status).toBe(403);
  });

  it("any other database error is not shown to the user (null → a plain 500)", () => {
    expect(aiRefusal("connection reset")).toBeNull();
  });
});
