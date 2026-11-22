"use client";
// Asks the server for this page again every 30 s (router.refresh()), so what other people change shows
// up without a reload: a new person in the team, an invite, a patient who finished in the room. Only on
// pages where others change things; never on the note pages, whose note lives in this tab.
//   - only while the tab is visible; coming back to a tab after 30 s or more refreshes it at once;
//   - not while someone is in a field (typing an email, choosing a role), so the page doesn't move
//     under their hands. It tries again a few seconds after they leave the field;
//   - never without a connection. When a refresh can't reach the server, Next loads the whole page
//     instead, and with no connection that is the browser's own offline page. So first a tiny request
//     (the tab icon, which skips the login check in proxy.ts); only if it answers, the refresh.
// A refresh only brings new data: React keeps whatever is typed or opened on the page.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const REFRESH_MS = 30_000;
const TICK_MS = 5_000; // how often it looks whether a refresh is due
const CHECK_MS = 5_000; // the icon has this long to answer

// A field someone is filling in: text, a list, a choice. Buttons don't count.
const FIELD =
  "textarea, select, [contenteditable]:not([contenteditable='false']), " +
  "input:not([type='button']):not([type='submit']):not([type='reset']):not([type='image']):not([type='hidden'])";
export const inField = (element: Element | null) => Boolean(element?.matches(FIELD));

async function reachable(): Promise<boolean> {
  if (navigator.onLine === false) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_MS);
  try {
    const response = await fetch("/icon.svg", { method: "HEAD", cache: "no-store", signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    let checking = false;
    let gone = false;
    const free = () => !gone && !document.hidden && !inField(document.activeElement);

    async function maybeRefresh() {
      if (checking || !free() || Date.now() - last < REFRESH_MS) return;
      checking = true;
      try {
        if ((await reachable()) && free()) {
          last = Date.now();
          router.refresh();
        }
      } finally {
        checking = false;
      }
    }

    const timer = setInterval(maybeRefresh, TICK_MS);
    const onVisible = () => {
      if (!document.hidden) void maybeRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
