"use server";
// The clinic's templates («Πρότυπα», owner or physio): save an approved program under a name and an area,
// create one the physio checked on «Πείτε τα πρότυπά σας», change a template's name and area, archive one. The database does every check again (20261124180000,
// 20261124220000): the program must be this clinic's,
// names are unique in the clinic's library, and a template never holds a patient's name or appointment.
// After each action the page shows a line saying what happened (?template=… or ?done=…).
import type { Route } from "next";
import { redirect } from "next/navigation";
import * as z from "zod";

import { cleanProgram } from "@/app/lib/notes/approval";
import { PatientProgram } from "@/app/lib/notes/schema";
import { requireMember, requireSameClinic } from "@/app/lib/onboarding/session";
import type { CardError } from "@/app/lib/templates/dictation";
import { TEMPLATE_AREA_MAX, TEMPLATE_NAME_MAX, type TemplateResult } from "@/app/lib/templates/load";

const Name = z.string().trim().min(1).max(TEMPLATE_NAME_MAX);

// The database's words for a refusal → what the page says. "other clinic": another clinic is open by now.
function resultOf(message: string): TemplateResult | "stale" {
  if (/other clinic/.test(message)) return "stale";
  if (/name taken/.test(message)) return "taken";
  if (/bad name/.test(message)) return "badname";
  if (/bad area/.test(message)) return "badarea";
  return "failed";
}

async function physio(form: FormData) {
  const member = await requireMember();
  if (member.profile.role === "assistant") redirect("/");
  requireSameClinic(form, member.profile); // the page was shown for another clinic: nothing changes
  return member;
}

// «Αποθήκευση ως πρότυπο» on the approved-program page (/programs/[id]).
export async function saveTemplate(form: FormData): Promise<void> {
  const { supabase, profile } = await physio(form);
  const programId = z.uuid().safeParse(form.get("programId"));
  if (!programId.success) redirect("/");
  const note = z.uuid().safeParse(form.get("note"));
  const back = (template: TemplateResult) => {
    const q = new URLSearchParams({ template });
    if (note.success) q.set("note", note.data);
    return `/programs/${programId.data}?${q}#template` as Route;
  };

  const name = Name.safeParse(form.get("name"));
  if (!name.success) redirect(back("badname"));
  const area = z.string().trim().max(TEMPLATE_AREA_MAX).safeParse(form.get("area") ?? "");
  if (!area.success) redirect(back("badarea"));
  const { error } = await supabase.rpc("save_template", {
    p_clinic_id: profile.clinic_id,
    p_program_id: programId.data,
    p_name: name.data,
    p_area: area.data || null,
  });
  if (error) {
    const result = resultOf(error.message);
    if (result === "stale") redirect("/?stale=1");
    if (result === "failed") console.error("save_template failed:", error.code, error.message);
    redirect(back(result));
  }
  redirect(back("saved"));
}

// «Αποθήκευση» on a template of /templates: its name and its area.
export async function updateTemplate(form: FormData): Promise<void> {
  const { supabase, profile } = await physio(form);
  const templateId = z.uuid().safeParse(form.get("templateId"));
  if (!templateId.success) redirect("/templates");
  const back = (done: TemplateResult) => `/templates?${new URLSearchParams({ done, open: templateId.data })}#t-${templateId.data}` as Route;

  const name = Name.safeParse(form.get("name"));
  if (!name.success) redirect(back("badname"));
  const area = z.string().trim().max(TEMPLATE_AREA_MAX).safeParse(form.get("area") ?? "");
  if (!area.success) redirect(back("badarea"));
  for (const [fn, args] of [
    ["rename_template", { p_clinic_id: profile.clinic_id, p_template_id: templateId.data, p_name: name.data }],
    ["set_template_area", { p_clinic_id: profile.clinic_id, p_template_id: templateId.data, p_area: area.data || null }],
  ] as const) {
    const { error } = await supabase.rpc(fn, args);
    if (error) {
      const result = resultOf(error.message);
      if (result === "stale") redirect("/?stale=1");
      if (result === "failed") console.error(`${fn} failed:`, error.code, error.message);
      redirect(back(result));
    }
  }
  redirect(back("renamed"));
}

// «Αρχειοθέτηση» on /templates: out of the library (the database keeps the row).
export async function archiveTemplate(form: FormData): Promise<void> {
  const { supabase, profile } = await physio(form);
  const templateId = z.uuid().safeParse(form.get("templateId"));
  if (!templateId.success) redirect("/templates");

  const { error } = await supabase.rpc("archive_template", { p_clinic_id: profile.clinic_id, p_template_id: templateId.data });
  if (error) {
    const result = resultOf(error.message);
    if (result === "stale") redirect("/?stale=1");
    console.error("archive_template failed:", error.code, error.message);
    redirect(`/templates?done=failed` as Route);
  }
  redirect(`/templates?done=archived` as Route);
}

// «Αποθήκευση» on one card of «Πείτε τα πρότυπά σας» (/templates/dictate): a template from the program the
// physio checked there. Called from the page with the card itself (not a form), so it answers instead of
// redirecting, and the page shows the result on that card. create_template (20261124230000) checks it all
// again, keeps only the program's own keys and never a patient.
export type CreateTemplateResult = { ok: true; id: string } | { ok: false; error: CardError };

const NewTemplate = z.object({
  clinicId: z.string(),
  name: Name,
  area: z.string().trim().max(TEMPLATE_AREA_MAX),
  program: PatientProgram,
});

export async function createTemplate(input: unknown): Promise<CreateTemplateResult> {
  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  const parsed = NewTemplate.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "name" ? "badname" : field === "area" ? "badarea" : field === "clinicId" ? "stale" : "badprogram" };
  }
  const { clinicId, name, area, program } = parsed.data;
  if (!profile.clinic_id || clinicId !== profile.clinic_id) return { ok: false, error: "stale" }; // as requireSameClinic
  const clean = cleanProgram(program); // exercises without a name left out, names trimmed, version stamped
  if (clean.exercises.length < 1 || clean.exercises.length > 40) return { ok: false, error: "badprogram" };

  const { data, error } = await supabase.rpc("create_template", {
    p_clinic_id: profile.clinic_id,
    p_name: name,
    p_area: area || null,
    p_program: { ...clean, patient_first_name: null, next_appointment: null },
  });
  if (error) {
    const result = /bad program/.test(error.message) ? "badprogram" : /too many templates/.test(error.message) ? "full" : resultOf(error.message);
    if (result === "failed") console.error("create_template failed:", error.code, error.message);
    return { ok: false, error: result as CardError };
  }
  return { ok: true, id: data as string };
}

