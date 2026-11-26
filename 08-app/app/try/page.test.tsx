// /try: the «Δοκιμάστε το» link. A visitor gets the button; someone in a demo goes back to it; a real
// account is told it is signed in. Greek by default, English with ?lang=en, and the r= code kept.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: null as unknown, profile: null as unknown }));
vi.mock("@/app/lib/onboarding/session", () => ({
  currentUser: async () => ({ supabase: {}, user: session.user }),
  loadProfile: async () => session.profile,
}));
vi.mock("@/app/components/paper/Captcha", () => ({ Captcha: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

import TryPage from "@/app/try/page";
import { expectNoA11yViolations } from "@/app/test/axe";

const open = async (query: Record<string, string> = {}) =>
  render(await TryPage({ params: Promise.resolve({}), searchParams: Promise.resolve(query) } as PageProps<"/try">));

beforeEach(() => {
  session.user = null;
  session.profile = null;
});

describe("/try", () => {
  it("a visitor: what they will see and one button, in Greek", async () => {
    const { container } = await open({ r: "blueatlas" });
    expect(screen.getByRole("heading", { level: 1, name: "Δοκιμάστε το PhysioPath" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Δοκιμάστε το τώρα/ })).toBeInTheDocument();
    expect(container.querySelector('input[name="ref"]')).toHaveValue("blueatlas");
    expect(container.querySelector('input[name="lang"]')).toHaveValue("el");
    expect(screen.getByText(/διαγράφεται μόνη της σε 7 μέρες/)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("?lang=en: everything in English, and the switch keeps the code", async () => {
    const { container } = await open({ r: "blueatlas", lang: "en" });
    expect(screen.getByRole("heading", { level: 1, name: "Try PhysioPath" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try it now/ })).toBeInTheDocument();
    expect(container.querySelector('input[name="lang"]')).toHaveValue("en");
    expect(screen.getByRole("link", { name: "ΕΛ" })).toHaveAttribute("href", "/try?r=blueatlas");
    expect(screen.getByRole("link", { name: "EN" })).toHaveAttribute("aria-current", "true");
  });

  it("the button is a normal form post to /try/start (built-in browsers keep the login that way)", async () => {
    const { container } = await open();
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/try/start");
  });

  it("back from /try/start with a problem: its message, in the page's language", async () => {
    await open({ e: "busy", lang: "en" });
    expect(screen.getByText(/Too many demos from the same network/)).toBeInTheDocument();
  });

  it("back from the board with no login (?lost=1): what to do, never the welcome page", async () => {
    await open({ lost: "1" });
    expect(screen.getByText(/δεν κράτησε τη σύνδεση/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Δοκιμάστε το τώρα/ })).toBeInTheDocument();
  });

  it("an unknown ?e= shows nothing", async () => {
    const { container } = await open({ e: "constructor" });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("a bad code is not carried along", async () => {
    const { container } = await open({ r: "<script>" });
    expect(container.querySelector('input[name="ref"]')).toBeNull();
  });

  it("someone already in their demo goes straight back to it", async () => {
    session.user = { id: "v1", is_anonymous: true };
    session.profile = { demo: { expiresAt: "2026-12-01T00:00:00Z", lang: "el" } };
    await expect(open()).rejects.toThrow("REDIRECT /");
  });

  it("a real account: no demo button, a link to the app instead", async () => {
    session.user = { id: "u1", is_anonymous: false };
    await open();
    expect(screen.queryByRole("button", { name: /Δοκιμάστε το τώρα/ })).toBeNull();
    expect(screen.getByText("Είστε ήδη συνδεδεμένοι με τον λογαριασμό σας.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Στην εφαρμογή" })).toHaveAttribute("href", "/");
  });
});
