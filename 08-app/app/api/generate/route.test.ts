// POST /api/generate with a template: the route reads the template itself (the clinic's own, not archived)
// and only then counts the AI call. Login, counting and Claude are replaced; what the database lets a physio
// read is checked in supabase/checks/rls_check.sql.
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ row: null as unknown, filters: [] as [string, unknown][] }));
const countAiCall = vi.fn();
const generate = vi.fn();
vi.mock("@/app/lib/notes/http", async (actual) => ({
  ...(await actual<typeof import("@/app/lib/notes/http")>()),
  requirePhysioApi: async () => {
    const query = {
      select: () => query,
      eq: (k: string, v: unknown) => (db.filters.push([k, v]), query),
      is: (k: string, v: unknown) => (db.filters.push([k, v]), query),
      maybeSingle: async () => ({ data: db.row }),
    };
    return { supabase: { from: () => query }, profile: { role: "physio", clinic_id: "c1" } };
  },
  countAiCall: (...args: unknown[]) => countAiCall(...args),
}));
vi.mock("@/app/lib/notes/generate", () => ({
  GenerationError: class extends Error {},
  generate: (...args: unknown[]) => generate(...args),
}));

const { POST } = await import("@/app/api/generate/route");

const TEMPLATE = "7b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";
const program = {
  title: "Γόνατο",
  patient_first_name: null,
  next_appointment: null,
  exercises: [{ name: "SLR", sets: 3, reps: "10", hold: null, frequency: null, notes: null }],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
};
const post = (body: unknown) =>
  POST(new Request("http://x/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  db.row = null;
  db.filters = [];
  generate.mockResolvedValue({ result: {}, seconds: 1 });
});

describe("POST /api/generate, mode template", () => {
  it("reads the clinic's template (not archived) and sends it with the text", async () => {
    db.row = { name: "Γόνατο μετά ACL", program: { version: 1, ...program } };
    const response = await post({ transcript: "Χωρίς αλλαγές", noteLang: "el", mode: "template", templateId: TEMPLATE });
    expect(response.status).toBe(200);
    expect(db.filters).toEqual([["id", TEMPLATE], ["archived_at", null]]);
    expect(countAiCall).toHaveBeenCalledWith(expect.anything(), "generate");
    expect(generate).toHaveBeenCalledWith("Χωρίς αλλαγές", "el", "template", { name: "Γόνατο μετά ACL", program });
  });

  it("a template that isn't there (another clinic, archived): 404, and the AI call isn't counted", async () => {
    const response = await post({ transcript: "x", noteLang: "el", mode: "template", templateId: TEMPLATE });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/Το πρότυπο δεν βρέθηκε/);
    expect(countAiCall).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("mode template without a template id is refused before counting", async () => {
    expect((await post({ transcript: "x", noteLang: "el", mode: "template" })).status).toBe(400);
    expect(countAiCall).not.toHaveBeenCalled();
  });

  it("a usual program never reads a template", async () => {
    await post({ transcript: "Γέφυρα 3x10", noteLang: "el", templateId: TEMPLATE });
    expect(db.filters).toEqual([]);
    expect(generate).toHaveBeenCalledWith("Γέφυρα 3x10", "el", "program", undefined);
  });
});
