// The tour's line on the pages other than the board: during steps 1–2 (with a button to the sample and to the
// GeSY note on the two long pages), and after the tour only on the pages of «Δείτε και αυτά» (a patient's home
// diary, templates, say your templates, the recording page), which it ticks off.
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

describe("DemoCoach during step 1", () => {
  it("the patient page names Γιώργος Π., and the line counts «1/3», not a second «Βήμα»", async () => {
    const id = clinic();
    store(id, { step: 1, since: new Date().toISOString() });
    nav.path = "/notes/new";
    render(<DemoCoach lang="el" clinicId={id} />);
    const line = await screen.findByRole("complementary", { name: "Ξενάγηση" });
    expect(line).toHaveTextContent("Ξενάγηση · 1/3: Διαλέξτε τον Γιώργο Π. και πατήστε «Συνέχεια».");
    expect(line).not.toHaveTextContent("Βήμα");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("the recording page has a pulsing button down to the ready sample", async () => {
    const id = clinic();
    store(id, { step: 1, since: new Date().toISOString() });
    nav.path = "/notes/record";
    render(<DemoCoach lang="el" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("πατήστε το δείγμα «Γιώργος · αριστερό γόνατο»");
    const jump = screen.getByRole("link", { name: /Στο δείγμα/ });
    expect(jump).toHaveAttribute("href", "#samples-h");
    expect(jump).toHaveClass("tour-pulse");
  });

  it("the review page points to the GeSY note and says to pick a procedure code before «Έγκριση»", async () => {
    const id = clinic();
    store(id, { step: 1, since: new Date().toISOString() });
    nav.path = "/notes/review";
    render(<DemoCoach lang="el" clinicId={id} />);
    const line = await screen.findByRole("complementary");
    expect(line).toHaveTextContent("η σημείωση για τον ΓεΣΥ σε 4 μέρη");
    expect(line).toHaveTextContent("κωδικό πράξης (π.χ. PHYS02)");
    expect(screen.getByRole("link", { name: /Η σημείωση ΓεΣΥ/ })).toHaveAttribute("href", "#n-h");
  });

  it("in English the patient is George P., as in the English demo", async () => {
    const id = clinic();
    store(id, { step: 1, since: new Date().toISOString() });
    nav.path = "/notes/new";
    render(<DemoCoach lang="en" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("Guided tour · 1/3: Pick George P.");
  });
});

describe("DemoCoach after the tour", () => {
  it("a patient's page: the home diary, ticked for the end of the tour", async () => {
    const id = clinic();
    store(id, { step: 4 });
    nav.path = "/patients/a1";
    render(<DemoCoach lang="el" clinicId={id} />);
    expect(await screen.findByRole("complementary")).toHaveTextContent("Ξενάγηση · Δείτε και αυτά: Το ημερολόγιο του ασθενή");
    expect(saved(id).seen).toEqual(["diary"]);
  });

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
