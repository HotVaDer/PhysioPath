"use client";
// The state of «Πείτε τα πρότυπά σας» and «Αλλαγή με φωνή» (app/lib/templates/dictation.ts), kept in this tab's
// sessionStorage so a refresh or a visit to another page loses nothing. Another person or clinic in the same tab
// never sees it; accept() can refuse a saved state for more reasons (the template changed since). A slow answer
// that arrives after the physio left the page still goes into the saved state (as DraftProvider does).
import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch } from "react";

import { dictationReducer, emptyDictation, parseDictation, type Dictation, type DictationAction } from "@/app/lib/templates/dictation";

type Options = { initial?: Dictation; accept?: (saved: Dictation) => boolean };

export function useDictation(storageKey: string, clinicId: string, userId: string, { initial = emptyDictation, accept }: Options = {}) {
  const [state, dispatchHere] = useReducer(dictationReducer, initial);
  const [ready, setReady] = useState(false);
  const here = useRef(true);
  const acceptRef = useRef(accept);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  const dispatch = useCallback<Dispatch<DictationAction>>(
    (action) => {
      if (here.current) return dispatchHere(action);
      try {
        const saved = parseDictation(sessionStorage.getItem(storageKey));
        if (saved) sessionStorage.setItem(storageKey, JSON.stringify(dictationReducer(saved, action)));
      } catch {
        // Storage blocked: nothing was kept anyway.
      }
    },
    [storageKey],
  );

  useEffect(() => {
    try {
      const saved = parseDictation(sessionStorage.getItem(storageKey));
      const ok = saved && saved.userId === userId && saved.clinicId === clinicId && (acceptRef.current?.(saved) ?? true);
      if (ok) dispatch({ type: "restore", state: saved });
      else if (saved) sessionStorage.removeItem(storageKey); // someone else's, another clinic's, or out of date
    } catch {
      // Storage blocked (e.g. private mode): the work just isn't kept across refreshes.
    }
    dispatch({ type: "stamp", userId, clinicId });
    setReady(true);
  }, [dispatch, storageKey, userId, clinicId]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // See above.
    }
  }, [state, ready, storageKey]);

  return { state, dispatch, ready };
}
