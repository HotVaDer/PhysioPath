// «Πείτε τα πρότυπά σας» (owner and physio): the physio says their usual programs once, the AI splits them
// into templates, and the physio checks and saves each one (DictateForm). Linked from «Πρότυπα».
// Assistants go home, like «Πρότυπα».
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { TabName } from "@/app/components/paper/TabLink";
import { TEMPLATES_SAMPLE } from "@/app/lib/notes/samples";
import { requireMember } from "@/app/lib/onboarding/session";
import { WORK_TAB } from "@/app/lib/tabs";
import { nameKey } from "@/app/lib/templates/dictation";
import { loadTemplates } from "@/app/lib/templates/load";

import { DictateForm } from "./DictateForm";

export const metadata: Metadata = { title: "Πείτε τα πρότυπά σας" };

export default async function DictatePage() {
  const { supabase, user, profile } = await requireMember();
  if (profile.role === "assistant" || !profile.clinic_id) redirect("/");
  // The library's names, to warn about a name already taken while the physio types (the database decides).
  const libraryNames = (await loadTemplates(supabase)).map((t) => nameKey(t.name));
  return (
    <StaffSheet profile={profile} current="templates">
      <TabName name={WORK_TAB} />
      <DictateForm
        clinicId={profile.clinic_id}
        userId={user.id}
        libraryNames={libraryNames}
        sample={TEMPLATES_SAMPLE}
        demoLeft={profile.demo?.left ?? null}
      />
    </StaffSheet>
  );
}
