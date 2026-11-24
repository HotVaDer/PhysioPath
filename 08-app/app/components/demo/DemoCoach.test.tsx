// The tour's line on the pages other than the board: during steps 1–2 as before, and after the tour only on
// the pages of «Δείτε και αυτά» (templates, say your templates, the recording page), which it ticks off.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/templates", search: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useSearchParams: () => new URLSearchParams(nav.search) }));

import { DemoCoach } from "@/app/components/demo/DemoCoach";
import { useMemoryStorage } from "@/app/test/storage";

useMemoryStorage();

let n = 0;
const clinic = () => `coach-${++n}`;
const store = (clinicId: string, tour: object) => localStorage.setItem(`physiopath:demo-tour:${clinicId}`, JSON.stringify(tour));
const saved = (clinicId: string) => JSON.parse(localStorage.getItem(`physiopath:demo-tour:${clinicId}`) ?? "null");

beforeEach(() => {
  nav.path = "/templates";
  nav.search = "";
});

describe("DemoCoach after the tour", () => {
  it("«Πρότυπα»: what to look at, back to the tour, and a ✓ for the end of the tour", async () => {
    const id = clinic();
    store(id, { step: 4 });
    render(<DemoCoach lang="el" clinicId={id} />);
    const line = await screen.findByRole("complementary", { name: "Ξενάγηση" });
    expect(line).toHaveTextContent("Ξενάγηση · Δείτε και αυτά: Τα πρότυπα της κλινικής.");
    expect(screen.getByRole("link", { name: /Στην ξενάγηση/ })).toHaveAttribute("href", "/");
    expect(saved(id).seen).toEqual(["templates"]);
  });

  it("«Πείτε τα πρότυπά σας» and the recording page have their own line", async () => {
    const id = clinic();
    store(id, { step: 4, seen: ["templates"] });
    nav.path = "/templates/dictate";
    const { unmount } = render(<DemoCoach lang="el" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("Πατήστε το παράδειγμα «Τρία πρότυπα»");
    expect(saved(id).seen).toEqual(["templates", "dictate"]);
    unmount();
    nav.path = "/notes/record";
    render(<DemoCoach lang="el" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("Διαλέξτε ένα πρότυπο πάνω, «Όπως είναι»");
  });

  it("no line on the other pages after the tour", async () => {
    const id = clinic();
    store(id, { step: 4 });
    nav.path = "/patients";
    const { container } = render(<DemoCoach lang="el" clinicId={id} />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it("during the tour «Πρότυπα» says to continue from the room, ticks nothing and doesn't start step 1", async () => {
    const id = clinic();
    store(id, { step: 2, since: new Date().toISOString() });
    render(<DemoCoach lang="el" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("Συνεχίστε την ξενάγηση από την αίθουσα.");
    expect(saved(id).seen).toBeUndefined();
    const fresh = clinic();
    render(<DemoCoach lang="el" clinicId={fresh} />);
    expect(saved(fresh)).toEqual({ step: 0 });
  });

  it("in English", async () => {
    const id = clinic();
    store(id, { step: 4 });
    render(<DemoCoach lang="en" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("Guided tour · See these too: The clinic's templates.");
  });
});
