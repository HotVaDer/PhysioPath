// What the physio sees when the database refuses a paid AI call (public.use_ai, migration
// 20261119120000_ai_limits.sql). Used by countAiCall in http.ts. Pure, so it is easy to test.
const MESSAGES: Record<string, string> = {
  "too fast": "Πολλά αιτήματα μέσα σε ένα λεπτό. Περιμένετε λίγο και δοκιμάστε ξανά.",
  "daily limit": "Η κλινική έφτασε το όριο για σήμερα. Δοκιμάστε ξανά αύριο.",
  "app limit": "Η υπηρεσία έφτασε το όριο για σήμερα. Δοκιμάστε ξανά αύριο.",
};

// The status and Greek message for a refusal, or null for any other error (then a plain 500,
// with the details only in the server log).
export function aiRefusal(databaseMessage: string): { status: number; message: string } | null {
  const limit = MESSAGES[databaseMessage];
  if (limit) return { status: 429, message: limit };
  if (databaseMessage === "not allowed") return { status: 403, message: "Μόνο οι φυσιοθεραπευτές γράφουν σημειώσεις." };
  return null;
}
