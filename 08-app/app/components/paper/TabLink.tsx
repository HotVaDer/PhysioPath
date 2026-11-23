"use client";
// The two pieces of the two-tab way of working (app/lib/tabs.ts).
import type { Route } from "next";
import Link from "next/link";
import { useEffect, type ComponentProps } from "react";

// Gives this browser tab its name, e.g. the board's tab becomes "physiopath-board". The name stays
// while the tab moves to other pages, until it opens a page that names it differently.
export function TabName({ name }: { name: string }) {
  useEffect(() => {
    window.name = name;
  }, [name]);
  return null;
}

// Firefox loads a page into a named tab but doesn't switch to it (it won't let sites change your tab),
// so the person would stay here, looking at nothing new. There every such link opens a new tab instead.
// (Firefox on an iPhone is Safari inside, "FxiOS", and switches fine.)
export const switchesTabs = (userAgent: string) => !/Firefox\//.test(userAgent);

// A phone-sized screen: one tab is the whole way of working there. Switching tabs on a phone opens a new
// tab the person doesn't see happen, so the link seems to do nothing (found testing «Δοκιμάστε το»).
export const onePhoneTab = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches;

// A link that belongs in a given tab. In that tab already: a normal link. In another tab: it goes to
// the tab with that name (the browser switches to it), so the page here stays as it is; in Firefox,
// to a new tab. Cmd/Ctrl/Shift-click and middle-click keep doing what the person asked for.
export function TabLink({ href, tab, onClick, ...rest }: ComponentProps<typeof Link> & { href: Route; tab?: string }) {
  return (
    <Link
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !tab || window.name === tab || onePhoneTab()) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!switchesTabs(navigator.userAgent)) {
          // Firefox: an ordinary "open in a new tab" link, followed by the browser itself (Next leaves
          // links with a target alone). noopener: the new tab starts without this tab's draft.
          event.currentTarget.setAttribute("target", "_blank");
          event.currentTarget.setAttribute("rel", "noopener");
          return;
        }
        event.preventDefault();
        window.open(href, tab);
      }}
    />
  );
}
