// Everything under /notes is the physio's: record a note, review it, approve it.
// Assistants go back to the room board (they never see clinical notes). The draft lives in this tab's
// sessionStorage (DraftProvider), so a refresh or Back never loses work.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { TabName } from "@/app/components/paper/TabLink";
import { DraftProvider } from "@/app/lib/notes/DraftContext";
import { requireMember } from "@/app/lib/onboarding/session";
import { WORK_TAB } from "@/app/lib/tabs";

export default async function NotesLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  // This tab is the work tab: the board's «Νέα συνεδρία» comes back here (app/lib/tabs.ts).
  return (
    <DraftProvider clinicId={profile.clinic_id!} userId={user.id}>
      <TabName name={WORK_TAB} />
      {children}
    </DraftProvider>
  );
}
