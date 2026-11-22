// The email button's first stop: it no longer signs anyone in by itself.
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/app/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));

const { GET } = await import("@/app/auth/confirm/route");

const INVITE = "/invite/6b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";
const get = (query: string) => GET(new NextRequest(`http://localhost:3001/auth/confirm?${query}`));
const location = (r: Response) => new URL(r.headers.get("location")!);

describe("GET /auth/confirm", () => {
  it("a link from our emails goes on to the «Συνέχεια» page, unused (email scanners don't press buttons)", async () => {
    const r = await get(`next=${encodeURIComponent(INVITE)}&token_hash=abc&type=invite`);
    const to = location(r);
    expect(to.pathname).toBe("/auth/continue");
    expect(to.searchParams.get("token_hash")).toBe("abc");
    expect(to.searchParams.get("type")).toBe("invite");
    expect(to.searchParams.get("next")).toBe(INVITE);
  });

  it("Supabase says the link is used up → sign in with a code, still heading for the invite", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const to = location(await get(`next=${encodeURIComponent(INVITE)}&error_code=otp_expired`));
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("link")).toBe("expired");
    expect(to.searchParams.get("next")).toBe(INVITE);
  });
});
