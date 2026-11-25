// The tour's storage: the closed sticky notes, and the pointer the patient's screen reads (2 hours).
import { describe, expect, it } from "vitest";

import { lastTour, loadTour, rememberTour } from "@/app/lib/demo/tour";
import { useMemoryStorage } from "@/app/test/storage";

useMemoryStorage();

describe("loadTour", () => {
  it("keeps notes: false, and drops anything else in its place", () => {
    localStorage.setItem("physiopath:demo-tour:c1", JSON.stringify({ step: 2, notes: false }));
    expect(loadTour("c1")).toEqual({ step: 2, notes: false });
    localStorage.setItem("physiopath:demo-tour:c2", JSON.stringify({ step: 2, notes: "off" }));
    expect(loadTour("c2")).toEqual({ step: 2 });
  });
});

describe("rememberTour and lastTour", () => {
  it("the patient's screen finds the tour for 2 hours, then not", () => {
    const now = Date.now();
    rememberTour("c1", "en");
    expect(lastTour(now)).toEqual({ clinicId: "c1", lang: "en" });
    expect(lastTour(now + 2 * 60 * 60 * 1000 + 60_000)).toBeNull();
  });

  it("nothing stored, or something broken: no tour", () => {
    expect(lastTour()).toBeNull();
    localStorage.setItem("physiopath:demo-tour:last", "{not json");
    expect(lastTour()).toBeNull();
    localStorage.setItem("physiopath:demo-tour:last", JSON.stringify({ clinicId: 5, at: Date.now() }));
    expect(lastTour()).toBeNull();
  });
});
