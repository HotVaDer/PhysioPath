// The buttons of «Δοκιμάστε το»: start a demo, leave it for a real sign-up, fill the board again.
// What the database allows (only visitors start demos, refill only in a demo) is checked against the real
// database in supabase/checks/rls_check.sql.
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInAnonymously = vi.fn();
const signOut = vi.fn();
const rpc = vi.fn();
const session = vi.hoisted(() => ({ user: null as unknown, profile: null as unknown }));
vi.mock("@/app/lib/onboarding/session", () => ({
  currentUser: async () => ({ supabase: { auth: { signInAnonymously, signOut }, rpc }, user: session.user }),
  loadProfile: async () => session.profile,
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { leaveDemo, refillDemo, startDemo } = await import("@/app/lib/demo/actions");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const start = (fields: Record<string, string>) => startDemo({}, form(fields)).catch((e: Error) => e.message);
const run = (action: () => Promise<void>) => action().catch((e: Error) => e.message);

beforeEach(() => {
  vi.clearAllMocks();
  session.user = null;
  session.profile = null;
  signInAnonymously.mockResolvedValue({ data: {}, error: null });
  rpc.mockResolvedValue({ data: "clinic-1", error: null });
});

describe("startDemo", () => {
  it("a new visitor: an anonymous login with the captcha, a demo in their language, then the board", async () => {
    expect(await start({ lang: "en", ref: "blueatlas", captchaToken: "tok" })).toBe("REDIRECT /?demo=1");
    expect(signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "tok" } });
    expect(rpc).toHaveBeenCalledWith("start_demo", { p_ref: "blueatlas", p_lang: "en" });
  });

  it("a bad ref or language is dropped, not sent", async () => {
    await start({ lang: "fr", ref: "<b>" });
    expect(rpc).toHaveBeenCalledWith("start_demo", { p_ref: null, p_lang: "el" });
  });

  it("a visitor already signed in (anonymous) doesn't get a second login", async () => {
    session.user = { id: "v1", is_anonymous: true };
    expect(await start({})).toBe("REDIRECT /?demo=1");
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("start_demo", { p_ref: null, p_lang: "el" });
  });

  it("a real account is never turned into a visitor", async () => {
    session.user = { id: "u1", is_anonymous: false };
    expect(await start({})).toBe("REDIRECT /");
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("too many demos from one network: a message in the page's language", async () => {
    signInAnonymously.mockResolvedValue({ data: {}, error: { status: 429, code: "over_request_rate_limit", message: "rate" } });
    expect(await start({ lang: "en" })).toEqual({ message: expect.stringContaining("Too many demos") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the security check not finished yet: asks to wait", async () => {
    signInAnonymously.mockResolvedValue({ data: {}, error: { status: 400, code: "captcha_failed", message: "no captcha_token found" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await start({})).toEqual({ message: expect.stringContaining("Περιμένετε να ολοκληρωθεί") });
  });

  it("the database refuses: a plain message, no redirect", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await start({})).toEqual({ message: expect.stringContaining("Δεν μπορέσαμε") });
  });
});

describe("leaveDemo", () => {
  it("a visitor is signed out and goes to the real sign-up", async () => {
    session.user = { id: "v1", is_anonymous: true };
    expect(await run(leaveDemo)).toBe("REDIRECT /register");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("a real account is not signed out by it", async () => {
    session.user = { id: "u1", is_anonymous: false };
    await run(leaveDemo);
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("refillDemo", () => {
  it("in a demo clinic: the patients come back on the board", async () => {
    session.user = { id: "v1", is_anonymous: true };
    session.profile = { demo: { expiresAt: "2026-12-01T00:00:00Z", lang: "el" } };
    expect(await run(refillDemo)).toBe("REDIRECT /");
    expect(rpc).toHaveBeenCalledWith("refill_demo");
  });

  it("in a real clinic: nothing happens", async () => {
    session.user = { id: "u1", is_anonymous: false };
    session.profile = { demo: null };
    expect(await run(refillDemo)).toBe("REDIRECT /");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("signed out: the welcome page", async () => {
    expect(await run(refillDemo)).toBe("REDIRECT /welcome");
  });
});
