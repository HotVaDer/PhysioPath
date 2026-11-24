// «Αλλαγή ασκήσεων» of one template (owner and physio): say what changes (the AI applies only that) or edit it
// by hand, see «Τι άλλαξε», and save: the template is replaced (EditTemplateForm). Linked from «Πρότυπα».
// Assistants go home; another clinic's or an archived template is «Δεν βρέθηκε».
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import * as z from "zod";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { TabName } from "@/app/components/paper/TabLink";
import { TEMPLATE_EDIT_SAMPLE } from "@/app/lib/notes/samples";
import { requireMember } from "@/app/lib/onboarding/session";
import { WORK_TAB } from "@/app/lib/tabs";
import { nameKey } from "@/app/lib/templates/dictation";
import { loadTemplate, loadTemplates } from "@/app/lib/templates/load";

import { EditTemplateForm } from "./EditTemplateForm";

export const metadata: Metadata = { title: "Αλλαγή προτύπου" };

export default async function EditTemplatePage({ params }: PageProps<"/templates/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, user, profile } = await requireMember();
  if (profile.role === "assistant" || !profile.clinic_id) redirect("/");
  const [template, all] = await Promise.all([loadTemplate(supabase, id), loadTemplates(supabase)]);
  if (!template) notFound();
  // The other templates' names: a warning while typing a name already in the library.
  const libraryNames = all.filter((t) => t.id !== id).map((t) => nameKey(t.name));
  return (
    <StaffSheet profile={profile} current="templates">
      <TabName name={WORK_TAB} />
      <EditTemplateForm
        clinicId={profile.clinic_id}
        userId={user.id}
        template={{ id: template.id, name: template.name, area: template.area ?? "", program: template.program }}
        libraryNames={libraryNames}
        sample={TEMPLATE_EDIT_SAMPLE}
        demoLeft={profile.demo?.left ?? null}
      />
    </StaffSheet>
  );
}
