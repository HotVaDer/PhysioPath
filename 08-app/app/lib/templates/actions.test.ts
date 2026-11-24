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

const { archiveTemplate, renameTemplate, saveTemplate } = await import("@/app/lib/templates/actions");

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
    expect(await run(saveTemplate, { programId: PROGRAM, note: NOTE, name: "  Γόνατο μετά ACL " })).toBe(
      `REDIRECT /programs/${PROGRAM}?template=saved&note=${NOTE}#template`,
    );
    expect(rpc).toHaveBeenCalledWith("save_template", { p_clinic_id: "c1", p_program_id: PROGRAM, p_name: "Γόνατο μετά ACL" });
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

describe("renameTemplate", () => {
  it("renames and opens the same template again", async () => {
    expect(await run(renameTemplate, { templateId: TEMPLATE, name: "Ώμος – κινητικότητα" })).toBe(
      `REDIRECT /templates?done=renamed&open=${TEMPLATE}#t-${TEMPLATE}`,
    );
    expect(rpc).toHaveBeenCalledWith("rename_template", { p_clinic_id: "c1", p_template_id: TEMPLATE, p_name: "Ώμος – κινητικότητα" });
  });

  it("a name already in the library: says so on that template", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "name taken" } });
    expect(await run(renameTemplate, { templateId: TEMPLATE, name: "Γόνατο" })).toBe(
      `REDIRECT /templates?done=taken&open=${TEMPLATE}#t-${TEMPLATE}`,
    );
  });

  it("assistants can't rename", async () => {
    member.role = "assistant";
    expect(await run(renameTemplate, { templateId: TEMPLATE, name: "Γόνατο" })).toBe("REDIRECT /");
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
