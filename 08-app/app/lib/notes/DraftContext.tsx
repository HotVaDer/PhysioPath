"use client";
// Shares the draft between the physio's pages (record → review → approved) and keeps it in
// sessionStorage, so a refresh or the Back button never loses work. sessionStorage belongs to this tab
// only and is cleared when the tab closes.
import { createContext, use, useCallback, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react";

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
// userId: who is signed in. A saved note written by someone else is thrown away, never shown.
export function DraftProvider({ children, clinicId, userId }: { children: ReactNode; clinicId: string; userId: string }) {
  const [draft, dispatchHere] = useReducer(draftReducer, emptyDraft);
  const [ready, setReady] = useState(false);

  // Still on the note's pages? A recording or a program takes seconds; if the physio left meanwhile
  // (the top bar, Back), the answer still has to be kept: it goes straight into the saved draft, through
  // the same rules (so an answer for another patient is still thrown away). Back on «Νέα συνεδρία», it's there.
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  const dispatch = useCallback<Dispatch<DraftAction>>((action) => {
    if (here.current) return dispatchHere(action);
    try {
      const saved = parseDraft(sessionStorage.getItem(STORAGE_KEY));
      if (saved) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftReducer(saved, action)));
    } catch {
      // Storage blocked: nothing was kept anyway.
    }
  }, []);

  useEffect(() => {
    if (ready && !draft.clinicId) dispatch({ type: "stampClinic", clinicId });
  }, [ready, draft.clinicId, clinicId, dispatch]);
  useEffect(() => {
    if (ready && !draft.userId) dispatch({ type: "stampUser", userId });
  }, [ready, draft.userId, userId, dispatch]);

  // After the page appears, bring back the saved draft. (It can't be read during the first render:
  // the server rendered the page without it, and both renders have to match.)
  useEffect(() => {
    try {
      const saved = parseDraft(sessionStorage.getItem(STORAGE_KEY));
      if (saved && saved.userId && saved.userId !== userId) sessionStorage.removeItem(STORAGE_KEY); // someone else's
      else if (saved) dispatch({ type: "restore", draft: saved });
    } catch {
      // Storage blocked (e.g. private mode): the draft just isn't kept across refreshes.
    }
    setReady(true);
  }, [dispatch, userId]);

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
