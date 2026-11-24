// The template buttons («Αποθήκευση ως πρότυπο», «Μετονομασία», «Αρχειοθέτηση»), with the login and the
// database replaced. What the database itself allows (clinic, role, unique names, no patient in a template)
// is checked against the real database in supabase/checks/rls_check.sql.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const member = vi.hoisted(() => ({ role: "physio" as "owner" | "physio" | "assistant" }));
vi.mock("@/app/lib/onboarding/session", () => ({
  requireMember: async () => ({ supabase: { rpc }, user: { id: "u1" }, profile: { role: member.role, clinic_id: "c1" } }),
  requireSameClinic: (form: FormData, profile: { clinic_id: string }) => {
    if (form.get("clinicId") !== profile.clinic_id) throw new Error("REDIRECT /?stale=1");
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { archiveTemplate, createTemplate, updateTemplate, updateTemplateProgram, saveTemplate } = await import("@/app/lib/templates/actions");

const PROGRAM = "5eed0000-0000-4000-8000-0000000000b1";
const NOTE = "5eed0000-0000-4000-8000-0000000000c1";
const TEMPLATE = "5eed0000-0000-4000-8000-0000000000d1";
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ clinicId: "c1", ...fields })) f.set(k, v);
  return f;
};
const run = (action: (f: FormData) => Promise<void>, fields: Record<string, string>) =>
  action(form(fields)).catch((e: Error) => e.message);

beforeEach(() => {
  vi.clearAllMocks();
  member.role = "physio";
  rpc.mockResolvedValue({ data: TEMPLATE, error: null });
});

describe("saveTemplate", () => {
  it("saves the program under the trimmed name and goes back to the program, keeping the visit", async () => {
    expect(await run(saveTemplate, { programId: PROGRAM, note: NOTE, name: "  Γόνατο μετά ACL ", area: " Γόνατο " })).toBe(
      `REDIRECT /programs/${PROGRAM}?template=saved&note=${NOTE}#template`,
    );
    expect(rpc).toHaveBeenCalledWith("save_template", { p_clinic_id: "c1", p_program_id: PROGRAM, p_name: "Γόνατο μετά ACL", p_area: "Γόνατο" });
  });

  it("no area: saved without one; an area over 60 characters is not sent", async () => {
    await run(saveTemplate, { programId: PROGRAM, name: "Ώμος" });
    expect(rpc).toHaveBeenCalledWith("save_template", { p_clinic_id: "c1", p_program_id: PROGRAM, p_name: "Ώμος", p_area: null });
    rpc.mockClear();
    expect(await run(saveTemplate, { programId: PROGRAM, name: "Ώμος", area: "α".repeat(61) })).toBe(`REDIRECT /programs/${PROGRAM}?template=badarea#template`);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("an empty or too long name is not sent", async () => {
    expect(await run(saveTemplate, { programId: PROGRAM, name: "   " })).toBe(`REDIRECT /programs/${PROGRAM}?template=badname#template`);
    expect(await run(saveTemplate, { programId: PROGRAM, name: "α".repeat(81) })).toBe(`REDIRECT /programs/${PROGRAM}?template=badname#template`);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a name already in the library: says so", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "name taken" } });
    expect(await run(saveTemplate, { programId: PROGRAM, name: "Ώμος" })).toBe(`REDIRECT /programs/${PROGRAM}?template=taken#template`);
  });

  it("another clinic open by now: nothing is saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "other clinic" } });
    expect(await run(saveTemplate, { programId: PROGRAM, name: "Ώμος" })).toBe("REDIRECT /?stale=1");
    expect(await run(saveTemplate, { clinicId: "c2", programId: PROGRAM, name: "Ώμος" })).toBe("REDIRECT /?stale=1");
  });

  it("assistants can't save templates", async () => {
    member.role = "assistant";
    expect(await run(saveTemplate, { programId: PROGRAM, name: "Ώμος" })).toBe("REDIRECT /");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a made-up program id goes home", async () => {
    expect(await run(saveTemplate, { programId: "x", name: "Ώμος" })).toBe("REDIRECT /");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("updateTemplate", () => {
  it("saves the name and the area, and opens the same template again", async () => {
    expect(await run(updateTemplate, { templateId: TEMPLATE, name: "Ώμος – κινητικότητα", area: "Ώμος" })).toBe(
      `REDIRECT /templates?done=renamed&open=${TEMPLATE}#t-${TEMPLATE}`,
    );
    expect(rpc).toHaveBeenCalledWith("rename_template", { p_clinic_id: "c1", p_template_id: TEMPLATE, p_name: "Ώμος – κινητικότητα" });
    expect(rpc).toHaveBeenCalledWith("set_template_area", { p_clinic_id: "c1", p_template_id: TEMPLATE, p_area: "Ώμος" });
  });

  it("a name already in the library: says so on that template", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "name taken" } });
    expect(await run(updateTemplate, { templateId: TEMPLATE, name: "Γόνατο" })).toBe(
      `REDIRECT /templates?done=taken&open=${TEMPLATE}#t-${TEMPLATE}`,
    );
  });

  it("assistants can't rename", async () => {
    member.role = "assistant";
    expect(await run(updateTemplate, { templateId: TEMPLATE, name: "Γόνατο" })).toBe("REDIRECT /");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("archiveTemplate", () => {
  it("archives and goes back to the list", async () => {
    expect(await run(archiveTemplate, { templateId: TEMPLATE })).toBe("REDIRECT /templates?done=archived");
    expect(rpc).toHaveBeenCalledWith("archive_template", { p_clinic_id: "c1", p_template_id: TEMPLATE });
  });

  it("an error: the list says it didn't happen", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "template not found" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(archiveTemplate, { templateId: TEMPLATE })).toBe("REDIRECT /templates?done=failed");
  });
});

describe("createTemplate («Πείτε τα πρότυπά σας»)", () => {
  const program = {
    title: " Πρόγραμμα ασκήσεων – Γόνατο ",
    patient_first_name: "Γιώργος",
    next_appointment: "Πέμπτη",
    exercises: [
      { name: " Ανυψώσεις τεντωμένου ποδιού ", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null },
      { name: "  ", sets: null, reps: null, hold: null, frequency: null, notes: null },
    ],
    after_exercises: ["Πάγος", " "],
    avoid: [],
    contact_if: [],
    other: [],
  };
  const card = (changes: Record<string, unknown> = {}) => ({ clinicId: "c1", name: "  Γόνατο μετά ACL ", area: " Γόνατο ", program, ...changes });

  it("sends the program tidied (empty exercises and lines out, version 1) without a patient, and answers with the id", async () => {
    expect(await createTemplate(card())).toEqual({ ok: true, id: TEMPLATE });
    expect(rpc).toHaveBeenCalledWith("create_template", {
      p_clinic_id: "c1",
      p_name: "Γόνατο μετά ACL",
      p_area: "Γόνατο",
      p_program: {
        version: 1,
        title: "Πρόγραμμα ασκήσεων – Γόνατο",
        patient_first_name: null,
        next_appointment: null,
        exercises: [{ name: "Ανυψώσεις τεντωμένου ποδιού", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null }],
        after_exercises: ["Πάγος"],
        avoid: [],
        contact_if: [],
        other: [],
      },
    });
  });

  it("no area: sent as none", async () => {
    await createTemplate(card({ area: "  " }));
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_area: null });
  });

  it("a bad name, area or program, or a page for another clinic, is not sent", async () => {
    expect(await createTemplate(card({ name: " " }))).toEqual({ ok: false, error: "badname" });
    expect(await createTemplate(card({ area: "α".repeat(61) }))).toEqual({ ok: false, error: "badarea" });
    expect(await createTemplate(card({ program: { ...program, exercises: [program.exercises[1]] } }))).toEqual({ ok: false, error: "badprogram" });
    expect(await createTemplate(card({ program: { title: "x" } }))).toEqual({ ok: false, error: "badprogram" });
    expect(await createTemplate(card({ clinicId: "c2" }))).toEqual({ ok: false, error: "stale" });
    expect(await createTemplate(null)).toEqual({ ok: false, error: "badprogram" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the database's refusals come back as the card's problem", async () => {
    for (const [message, error] of [
      ["name taken", "taken"],
      ["bad program", "badprogram"],
      ["too many templates", "full"],
      ["other clinic", "stale"],
      ["bad area", "badarea"],
      ["connection lost", "failed"],
    ]) {
      rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message } });
      expect(await createTemplate(card())).toEqual({ ok: false, error });
    }
  });

  it("an assistant is sent home", async () => {
    member.role = "assistant";
    expect(await createTemplate(card()).catch((e: Error) => e.message)).toBe("REDIRECT /");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("updateTemplateProgram («Αλλαγή με φωνή»)", () => {
  const program = {
    title: "Γόνατο",
    patient_first_name: "Γιώργος",
    next_appointment: null,
    exercises: [{ name: " Γέφυρα ", sets: 3, reps: "10", hold: null, frequency: null, notes: null }],
    after_exercises: [],
    avoid: [],
    contact_if: [],
    other: [],
  };
  const input = (changes: Record<string, unknown> = {}) => ({ clinicId: "c1", templateId: TEMPLATE, name: " Γόνατο εβδ. 3 ", area: "", program, ...changes });

  it("replaces the template with the checked program, tidied and without a patient", async () => {
    expect(await updateTemplateProgram(input())).toEqual({ ok: true, id: TEMPLATE });
    expect(rpc).toHaveBeenCalledWith("update_template", {
      p_clinic_id: "c1",
      p_template_id: TEMPLATE,
      p_name: "Γόνατο εβδ. 3",
      p_area: null,
      p_program: expect.objectContaining({ version: 1, patient_first_name: null, exercises: [expect.objectContaining({ name: "Γέφυρα" })] }),
    });
  });

  it("a bad id, another clinic's page or no exercises is not sent", async () => {
    expect(await updateTemplateProgram(input({ templateId: "x" }))).toEqual({ ok: false, error: "gone" });
    expect(await updateTemplateProgram(input({ clinicId: "c2" }))).toEqual({ ok: false, error: "stale" });
    expect(await updateTemplateProgram(input({ program: { ...program, exercises: [] } }))).toEqual({ ok: false, error: "badprogram" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the database's refusals: archived meanwhile, a name taken", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "template not found" } });
    expect(await updateTemplateProgram(input())).toEqual({ ok: false, error: "gone" });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "name taken" } });
    expect(await updateTemplateProgram(input())).toEqual({ ok: false, error: "taken" });
  });

  it("an assistant is sent home", async () => {
    member.role = "assistant";
    expect(await updateTemplateProgram(input()).catch((e: Error) => e.message)).toBe("REDIRECT /");
  });
});

