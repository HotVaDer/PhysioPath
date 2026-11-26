// POST /try/start: the button on /try as a normal form post. The answer is always a 303 (the browser follows
// it with a GET): to the board when the demo is ready, back to /try with the message's name otherwise,
// keeping the visitor's language and r= code. The login cookies on that answer come from Next.js itself.
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const beginDemo = vi.fn();
vi.mock("@/app/lib/demo/start", () => ({ beginDemo: (form: FormData) => beginDemo(form) }));

const { POST } = await import("@/app/try/start/route");

const post = (fields: Record<string, string>) => {
  const body = new URLSearchParams(fields);
  return POST(
    new NextRequest("https://physio-path-nine.vercel.app/try/start", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
};

beforeEach(() => beginDemo.mockReset());

describe("POST /try/start", () => {
  it("the demo is ready: 303 to the board, with the form's fields passed on", async () => {
    beginDemo.mockResolvedValue({ to: "/?demo=1" });
    const res = await post({ lang: "en", ref: "blueatlas", captchaToken: "tok" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://physio-path-nine.vercel.app/?demo=1");
    const form: FormData = beginDemo.mock.calls[0][0];
    expect([form.get("lang"), form.get("ref"), form.get("captchaToken")]).toEqual(["en", "blueatlas", "tok"]);
  });

  it("a real account: 303 to the app", async () => {
    beginDemo.mockResolvedValue({ to: "/" });
    const res = await post({});
    expect(res.headers.get("location")).toBe("https://physio-path-nine.vercel.app/");
  });

  it("a problem: 303 back to /try with its name, the code and the language", async () => {
    beginDemo.mockResolvedValue({ error: "busy" });
    const res = await post({ lang: "en", ref: "blueatlas" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://physio-path-nine.vercel.app/try?e=busy&r=blueatlas&lang=en");
  });

  it("a problem in Greek with a bad code: only the message's name comes back", async () => {
    beginDemo.mockResolvedValue({ error: "failed" });
    const res = await post({ lang: "el", ref: "<script>" });
    expect(res.headers.get("location")).toBe("https://physio-path-nine.vercel.app/try?e=failed");
  });
});
