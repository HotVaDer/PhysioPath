// The tour's sticky notes: the note on the button to press, the button pulsing and described by it, «×» and
// Escape closing them for the rest of the tour, and the patient's screen reading the tour the staff pages left.
// (jsdom has no layout, so every note here is the docked one; where it sits on a laptop is checked by hand.)
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/notes/new" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

import { TourNotes, arrowPath, marginPaths } from "@/app/components/demo/TourNotes";
import { expectNoA11yViolations } from "@/app/test/axe";
import { useMemoryStorage } from "@/app/test/storage";

useMemoryStorage();

let n = 0;
const clinic = () => `notes-${++n}`;
const store = (clinicId: string, tour: object) => localStorage.setItem(`physiopath:demo-tour:${clinicId}`, JSON.stringify(tour));
const saved = (clinicId: string) => JSON.parse(localStorage.getItem(`physiopath:demo-tour:${clinicId}`) ?? "null");

// The page the notes look at: the patient choice of «Νέα συνεδρία».
function PatientPage() {
  return (
    <main>
      <label>
        <input type="radio" name="patient" />
        Γιώργος Π.
      </label>
      <button type="button">Συνέχεια</button>
    </main>
  );
}

beforeEach(() => {
  nav.path = "/notes/new";
});

describe("TourNotes", () => {
  it("pins a note to Γιώργος Π., which pulses and is described by it; then moves to «Συνέχεια»", async () => {
    const id = clinic();
    store(id, { step: 1, since: new Date().toISOString() });
    const { container } = render(
      <>
        <PatientPage />
        <TourNotes lang="el" clinicId={id} />
      </>,
    );
    const note = await screen.findByRole("note", { name: "Ξενάγηση · 1/3" });
    expect(note).toHaveTextContent("Πατήστε τον Γιώργο Π.");
    const george = screen.getByText("Γιώργος Π.").closest("label")!;
    expect(george).toHaveClass("tour-pulse");
    expect(george).toHaveAccessibleDescription("Πατήστε τον Γιώργο Π.");

    await userEvent.click(screen.getByRole("radio"));
    await waitFor(() => expect(screen.getByRole("note")).toHaveTextContent("Τώρα «Συνέχεια»."));
    expect(george).not.toHaveClass("tour-pulse");
    expect(screen.getByRole("button", { name: "Συνέχεια" })).toHaveClass("tour-pulse");
    // read out once, politely
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("Ξενάγηση · 1/3: Τώρα «Συνέχεια».");
    await expectNoA11yViolations(container.ownerDocument.body);
  });

  it("«×» closes the notes for the rest of the tour, and the pulse goes too", async () => {
    const id = clinic();
    store(id, { step: 1, seen: ["templates"] });
    render(
      <>
        <PatientPage />
        <TourNotes lang="el" clinicId={id} />
      </>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Κλείσιμο σημειώσεων ξενάγησης" }));
    await waitFor(() => expect(screen.queryByRole("note")).toBeNull());
    expect(saved(id)).toEqual({ step: 1, seen: ["templates"], notes: false });
    expect(screen.getByText("Γιώργος Π.").closest("label")).not.toHaveClass("tour-pulse");
  });

  it("Escape closes them too", async () => {
    const id = clinic();
    store(id, { step: 1 });
    render(
      <>
        <PatientPage />
        <TourNotes lang="el" clinicId={id} />
      </>,
    );
    await screen.findByRole("note");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("note")).toBeNull());
    expect(saved(id).notes).toBe(false);
  });

  it("no note before or after the tour", async () => {
    const id = clinic();
    store(id, { step: 4 });
    render(
      <>
        <PatientPage />
        <TourNotes lang="el" clinicId={id} />
      </>,
    );
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("the patient's screen: the tour the staff pages left, with «Στην αίθουσα» once the call is sent", async () => {
    const id = clinic();
    store(id, { step: 2, since: new Date().toISOString() });
    // the staff page leaves the pointer
    const staff = render(<TourNotes lang="en" clinicId={id} />);
    staff.unmount();
    nav.path = "/s/tok";
    render(
      <>
        <section role="status">
          <p>Ο φυσιοθεραπευτής ειδοποιήθηκε</p>
        </section>
        <TourNotes />
      </>,
    );
    const note = await screen.findByRole("note", { name: "Guided tour · 2/3" });
    expect(note).toHaveTextContent("Sent! Go back to the room");
    expect(screen.getByRole("link", { name: /To the room/ })).toHaveAttribute("href", "/");
  });

  it("a patient's screen in a browser that isn't doing a tour: nothing", async () => {
    nav.path = "/s/tok";
    render(
      <>
        <button type="button">Χρειάζομαι τον φυσιοθεραπευτή</button>
        <TourNotes />
      </>,
    );
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByRole("button")).not.toHaveClass("tour-pulse");
  });
});

describe("an either/or note (the recording page)", () => {
  it("both the sample and «Έναρξη ηχογράφησης» pulse and are described by the one note", async () => {
    nav.path = "/notes/record";
    const id = clinic();
    store(id, { step: 1 });
    render(
      <>
        <main>
          <button type="button">Έναρξη ηχογράφησης</button>
          <button type="button">Γιώργος · αριστερό γόνατο</button>
        </main>
        <TourNotes lang="el" clinicId={id} />
      </>,
    );
    expect(await screen.findByRole("note")).toHaveTextContent("Πατήστε ένα έτοιμο δείγμα, ή «Έναρξη ηχογράφησης»");
    for (const name of ["Έναρξη ηχογράφησης", "Γιώργος · αριστερό γόνατο"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("tour-pulse");
      expect(button).toHaveAccessibleDescription(/Πατήστε ένα έτοιμο δείγμα/);
    }
  });
});

describe("the arrows' shapes", () => {
  const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

  it("arrowPath: from the note's edge to just outside the button, or nothing when they touch", () => {
    const d = arrowPath(box(400, 500, 700, 600), box(100, 100, 300, 150))!;
    expect(d).toMatch(/^M400\.0 500\.0 Q/); // the note's corner nearest the button
    expect(arrowPath(box(0, 0, 100, 100), box(105, 0, 200, 100))).toBeNull();
  });

  it("marginPaths: one lane per button in view, outward in turn, turning left into each", () => {
    const note = box(12, 700, 378, 830);
    const [sample, record] = marginPaths(note, [box(30, 330, 280, 370), box(30, 40, 310, 100)], 390);
    expect(sample).toMatch(/^M304\.0 696\.0 L304\.0 /); // 280 + 24
    expect(sample).toContain("L290.0 350.0"); // the tip, just right of the button, at its middle
    expect(record).toMatch(/^M334\.0 /); // 310 + 24, outside the first lane
    // a button below the note's top (hidden behind it) or with no margin beside it: no arrow
    expect(marginPaths(note, [box(30, 720, 280, 760), box(0, 40, 380, 100)], 390)).toEqual([]);
  });
});
