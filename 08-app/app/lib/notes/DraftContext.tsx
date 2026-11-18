"use client";
// Shares the draft between the physio's pages (record → review → approved) and keeps it in
// sessionStorage, so a refresh or the Back button never loses work. sessionStorage belongs to this tab
// only and is cleared when the tab closes.
import { createContext, use, useEffect, useReducer, useState, type Dispatch, type ReactNode } from "react";

import { draftReducer, emptyDraft, parseDraft, type Draft, type DraftAction } from "@/app/lib/notes/draft";

export const STORAGE_KEY = "physiopath:note-draft";

type DraftContextValue = {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  ready: boolean; // false until the saved draft has been read (the server can't see sessionStorage)
};

const DraftContext = createContext<DraftContextValue | null>(null);

// clinicId: the clinic open now. A note without one (new, or after «reset») is stamped with it; a note
// started in another clinic keeps that one (see Draft.clinicId).
export function DraftProvider({ children, clinicId }: { children: ReactNode; clinicId: string }) {
  const [draft, dispatch] = useReducer(draftReducer, emptyDraft);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready && !draft.clinicId) dispatch({ type: "stampClinic", clinicId });
  }, [ready, draft.clinicId, clinicId]);

  // After the page appears, bring back the saved draft. (It can't be read during the first render:
  // the server rendered the page without it, and both renders have to match.)
  useEffect(() => {
    try {
      const saved = parseDraft(sessionStorage.getItem(STORAGE_KEY));
      if (saved) dispatch({ type: "restore", draft: saved });
    } catch {
      // Storage blocked (e.g. private mode): the draft just isn't kept across refreshes.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // See above.
    }
  }, [draft, ready]);

  return <DraftContext value={{ draft, dispatch, ready }}>{children}</DraftContext>;
}

export function useDraft(): DraftContextValue {
  const value = use(DraftContext);
  if (!value) throw new Error("useDraft must be used inside <DraftProvider>.");
  return value;
}
