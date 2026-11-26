// The buttons of «Δοκιμάστε το»: leave the demo for a real sign-up, fill the board again (starting one:
// start.test.ts).
// What the database allows (only visitors start demos, refill only in a demo) is checked against the real
// database in supabase/checks/rls_check.sql.
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
const rpc = vi.fn();
const session = vi.hoisted(() => ({ user: null as unknown, profile: null as unknown }));
vi.mock("@/app/lib/onboarding/session", () => ({
  currentUser: async () => ({ supabase: { auth: { signOut }, rpc }, user: session.user }),
  loadProfile: async () => session.profile,
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { leaveDemo, refillDemo } = await import("@/app/lib/demo/actions");

const run = (action: () => Promise<void>) => action().catch((e: Error) => e.message);

beforeEach(() => {
  vi.clearAllMocks();
  session.user = null;
  session.profile = null;
  rpc.mockResolvedValue({ data: "clinic-1", error: null });
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
