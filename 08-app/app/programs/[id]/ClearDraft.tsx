"use client";
// After approval the draft is done: clear it, so Back to the review page can't approve it again
// (approve_program would return the same program anyway, thanks to the draft id).
import { useEffect } from "react";

import { STORAGE_KEY } from "@/app/lib/notes/DraftContext";

export function ClearDraft() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage blocked: nothing was kept anyway
    }
  }, []);
  return null;
}
