// Where email links may send people, and where a failed one lands.
import { describe, expect, it } from "vitest";

import { isEmailLinkType, loginAfterLink, safeNext } from "@/app/lib/site";

const INVITE = "/invite/6b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";

describe("loginAfterLink", () => {
  it("an expired invite link keeps the invite, so after the code the person lands on it", () => {
    expect(loginAfterLink("expired", INVITE)).toBe(`/login?link=expired&next=${encodeURIComponent(INVITE)}`);
  });
  it("home needs no next", () => {
    expect(loginAfterLink("other-browser", "/")).toBe("/login?link=other-browser");
  });
});

describe("isEmailLinkType", () => {
  it("only the kinds our emails use", () => {
    expect(["email", "magiclink", "signup", "invite"].every(isEmailLinkType)).toBe(true);
    expect(isEmailLinkType("recovery")).toBe(false);
    expect(isEmailLinkType(null)).toBe(false);
  });
});

describe("safeNext", () => {
  it("lets an invite page through, nothing from elsewhere", () => {
    expect(safeNext(INVITE)).toBe(INVITE);
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example/invite/x")).toBe("/");
  });
});
