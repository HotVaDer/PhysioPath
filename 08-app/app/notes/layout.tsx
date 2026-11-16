// Everything under /notes is the physio's: record a note, review it, approve it.
// Assistants go back to the room board (they never see clinical notes). The draft lives in this tab's
// sessionStorage (DraftProvider), so a refresh or Back never loses work.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DraftProvider } from "@/app/lib/notes/DraftContext";
import { requireMember } from "@/app/lib/onboarding/session";

export default async function NotesLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  return <DraftProvider>{children}</DraftProvider>;
}
