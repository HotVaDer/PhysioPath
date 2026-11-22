// The letter's presses reach the database only as home_log(token, …), with the anon client.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/app/lib/supabase/admin", () => ({ createAnonClient: () => ({ rpc }) }));

const { POST } = await import("@/app/api/p/[token]/route");

const TOKEN = "3f0c2b9e-6a1d-4c8e-9b7a-1d2e3f4a5b6c";
const PRESS = { day: "2026-11-22", exercise: 1, status: "done", pain: 3, note: "λίγο" };
const post = (body: unknown, token = TOKEN) =>
  POST(new Request(`http://localhost:3001/api/p/${token}`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }), {
    params: Promise.resolve({ token }),
  } as RouteContext<"/api/p/[token]">);

beforeEach(() => rpc.mockReset());

describe("POST /api/p/[token]", () => {
  it("saves a press through home_log and answers with the diary, never cached", async () => {
    const log = [{ ...PRESS }];
    rpc.mockResolvedValue({ data: { status: "ok", program: { exercises: [] }, clinicName: "x", log }, error: null });
    const response = await post(PRESS);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", log });
    expect(rpc).toHaveBeenCalledWith("home_log", {
      p_token: TOKEN,
      p_day: "2026-11-22",
      p_exercise: 1,
      p_status: "done",
      p_pain: 3,
      p_note: "λίγο",
    });
  });

  it("taking a press back sends no status", async () => {
    rpc.mockResolvedValue({ data: { status: "ok", log: [] }, error: null });
    await post({ ...PRESS, status: null, pain: null, note: null });
    expect(rpc).toHaveBeenCalledWith("home_log", expect.objectContaining({ p_status: null }));
  });

  it("a newer program: says so, with nothing else", async () => {
    rpc.mockResolvedValue({ data: { status: "newer", clinicName: "x", clinicPhone: "1" }, error: null });
    expect(await (await post(PRESS)).json()).toEqual({ status: "newer" });
  });

  it("a wrong token is 404; one that isn't a token never reaches the database", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await post(PRESS)).status).toBe(404);
    rpc.mockClear();
    expect((await post(PRESS, "not-a-token")).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["not JSON", "{oops"],
    ["a day in another format", { ...PRESS, day: "22/11/2026" }],
    ["pain 11", { ...PRESS, pain: 11 }],
    ["an unknown status", { ...PRESS, status: "maybe" }],
    ["a note over 500 characters", { ...PRESS, note: "α".repeat(501) }],
  ])("%s is refused with a Greek message, without the database", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Δεν αποθηκεύτηκε. Δοκιμάστε ξανά." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the database refusing (a day out of range) is 400; any other error 500, details in the log only", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "day out of range" } });
    expect((await post(PRESS)).status).toBe(400);
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    const response = await post(PRESS);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("connection");
  });
});
