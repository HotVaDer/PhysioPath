// The texts and small helpers of «Δοκιμάστε το» (the /try link and the demo clinic).
import { describe, expect, it } from "vitest";

import { daysLeft, demoText, pickLang, pickRef } from "@/app/lib/demo/text";

describe("pickLang", () => {
  it("English only for ?lang=en, Greek for anything else", () => {
    expect(pickLang("en")).toBe("en");
    expect(pickLang("el")).toBe("el");
    expect(pickLang(undefined)).toBe("el");
    expect(pickLang(["en"])).toBe("el");
    expect(pickLang("EN; drop table")).toBe("el");
  });
});

describe("pickRef", () => {
  it("keeps a short code from the link, in lower case", () => {
    expect(pickRef("blueatlas")).toBe("blueatlas");
    expect(pickRef("  Blue-Atlas ")).toBe("blue-atlas");
  });

  it("drops anything that isn't a short code", () => {
    expect(pickRef(undefined)).toBeUndefined();
    expect(pickRef("")).toBeUndefined();
    expect(pickRef("a b")).toBeUndefined();
    expect(pickRef("<script>")).toBeUndefined();
    expect(pickRef("x".repeat(41))).toBeUndefined();
    expect(pickRef(["a"])).toBeUndefined();
  });
});

describe("daysLeft", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  it("counts whole days up to the deletion, never less than 1", () => {
    expect(daysLeft("2026-12-01T10:00:00Z", now)).toBe(7);
    expect(daysLeft("2026-11-25T09:00:00Z", now)).toBe(1);
    expect(daysLeft("2026-11-24T09:00:00Z", now)).toBe(1);
  });
});

describe("demoText", () => {
  it("has the same texts in Greek and English", () => {
    const el = demoText("el");
    const en = demoText("en");
    expect(Object.keys(en).sort()).toEqual(Object.keys(el).sort());
    expect(el.steps).toHaveLength(3);
    expect(en.steps).toHaveLength(3);
    expect(el.points).toHaveLength(en.points.length);
  });

  it("says in English that the app's screens are Greek, and nothing like that in Greek", () => {
    expect(demoText("en").stripAppInGreek).toMatch(/Greek/);
    expect(demoText("el").stripAppInGreek).toBeNull();
  });

  it("counts the days in both languages", () => {
    expect(demoText("el").stripText(1)).toContain("1 μέρα");
    expect(demoText("el").stripText(7)).toContain("7 μέρες");
    expect(demoText("en").stripText(1)).toContain("1 day");
    expect(demoText("en").stripText(7)).toContain("7 days");
  });
});
