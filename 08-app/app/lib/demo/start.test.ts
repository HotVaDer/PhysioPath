// What the button on /try does (beginDemo, used by POST /try/start): a login for a new visitor, a demo in
// their language, and the name of the message when something goes wrong. Moved from the old server action
// startDemo on 2026-11-25; what the database allows is checked in supabase/checks/rls_check.sql.
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInAnonymously = vi.fn();
const rpc = vi.fn();
const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/app/lib/onboarding/session", () => ({
  currentUser: async () => ({ supabase: { auth: { signInAnonymously }, rpc }, user: session.user }),
}));

const { beginDemo } = await import("@/app/lib/demo/start");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const start = (fields: Record<string, string>) => beginDemo(form(fields));

beforeEach(() => {
  vi.clearAllMocks();
  session.user = null;
  signInAnonymously.mockResolvedValue({ data: {}, error: null });
  rpc.mockResolvedValue({ data: "clinic-1", error: null });
});

describe("beginDemo", () => {
  it("a new visitor: an anonymous login with the captcha, a demo in their language, then the board", async () => {
    expect(await start({ lang: "en", ref: "blueatlas", captchaToken: "tok" })).toEqual({ to: "/?demo=1" });
    expect(signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "tok" } });
    expect(rpc).toHaveBeenCalledWith("start_demo", { p_ref: "blueatlas", p_lang: "en" });
  });

  it("a bad ref or language is dropped, not sent", async () => {
    await start({ lang: "fr", ref: "<b>" });
    expect(rpc).toHaveBeenCalledWith("start_demo", { p_ref: null, p_lang: "el" });
  });

  it("a visitor already signed in (anonymous) doesn't get a second login", async () => {
    session.user = { id: "v1", is_anonymous: true };
    expect(await start({})).toEqual({ to: "/?demo=1" });
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("start_demo", { p_ref: null, p_lang: "el" });
  });

  it("a real account is never turned into a visitor", async () => {
    session.user = { id: "u1", is_anonymous: false };
    expect(await start({})).toEqual({ to: "/" });
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("too many demos from one network: «busy», and no demo", async () => {
    signInAnonymously.mockResolvedValue({ data: {}, error: { status: 429, code: "over_request_rate_limit", message: "rate" } });
    expect(await start({ lang: "en" })).toEqual({ error: "busy" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the security check not finished yet: «captchaWait»; refused: «captchaFailed»", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAnonymously.mockResolvedValue({ data: {}, error: { status: 400, code: "captcha_failed", message: "no captcha_token found" } });
    expect(await start({})).toEqual({ error: "captchaWait" });
    signInAnonymously.mockResolvedValue({ data: {}, error: { status: 400, code: "captcha_failed", message: "captcha protection: invalid" } });
    expect(await start({})).toEqual({ error: "captchaFailed" });
  });

  it("the login or the database refuses: «failed»", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await start({})).toEqual({ error: "failed" });
    signInAnonymously.mockResolvedValue({ data: {}, error: { status: 500, message: "down" } });
    expect(await start({})).toEqual({ error: "failed" });
  });
});
