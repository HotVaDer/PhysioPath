// «Συνέχεια» on /auth/continue: only this press uses the email's one-time link.
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const forgetInviteEmail = vi.fn();
vi.mock("@/app/lib/onboarding/session", () => ({
  currentUser: async () => ({ supabase: { auth: { verifyOtp } }, user: null }),
  requireFormUser: vi.fn(),
  requireMember: vi.fn(),
  requireSameClinic: vi.fn(),
  saveDraft: vi.fn(),
}));
vi.mock("@/app/lib/onboarding/invites", () => ({ forgetInviteEmail: (u: unknown) => forgetInviteEmail(u), sendInvites: vi.fn() }));
vi.mock("@/app/lib/supabase/admin", () => ({ createAdminClient: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { followEmailLink } = await import("@/app/lib/onboarding/actions");

const INVITE = "/invite/6b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const press = (fields: Record<string, string>) => followEmailLink(form(fields)).catch((e: Error) => e.message);

beforeEach(() => vi.clearAllMocks());

describe("followEmailLink", () => {
  it("signs in with the link, forgets the invite wording, and goes to the invite", async () => {
    const user = { id: "u1", user_metadata: { invite_clinic: "Κλινική Β" } };
    verifyOtp.mockResolvedValue({ data: { user }, error: null });
    expect(await press({ token_hash: "abc", type: "invite", next: INVITE })).toBe(`REDIRECT ${INVITE}`);
    expect(verifyOtp).toHaveBeenCalledWith({ type: "invite", token_hash: "abc" });
    expect(forgetInviteEmail).toHaveBeenCalledWith(user);
  });

  it("a used or expired link → sign in with a code, and the invite is still where they land after", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: "otp_expired", message: "expired" } });
    expect(await press({ token_hash: "abc", type: "invite", next: INVITE })).toBe(
      `REDIRECT /login?link=expired&next=${encodeURIComponent(INVITE)}`,
    );
  });

  it("a made-up type or a missing link is never sent to Supabase", async () => {
    expect(await press({ token_hash: "abc", type: "recovery", next: "/" })).toBe("REDIRECT /login?link=expired");
    expect(await press({ type: "email", next: "/" })).toBe("REDIRECT /login?link=expired");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("next can't point to another site", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: null });
    expect(await press({ token_hash: "abc", type: "email", next: "https://evil.example" })).toBe("REDIRECT /");
  });
});
