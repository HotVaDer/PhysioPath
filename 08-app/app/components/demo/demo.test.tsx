// The demo clinic's strip (every page) and «Δοκιμάστε» (the board), and the staff frame around them.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The buttons post to server actions (server-only code); plain functions stand in for them here.
vi.mock("@/app/lib/demo/actions", () => ({ leaveDemo: vi.fn(), refillDemo: vi.fn() }));
vi.mock("@/app/lib/onboarding/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/app/lib/board/actions", () => ({ finishCard: vi.fn(), seeCall: vi.fn() }));

import { DemoStrip } from "@/app/components/demo/DemoStrip";
import { DemoGuide } from "@/app/components/demo/DemoGuide";
import { BOARD_EVENT } from "@/app/components/board/RoomBoard";
import type { BoardCard } from "@/app/lib/board/board";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { expectNoA11yViolations } from "@/app/test/axe";
import { useMemoryStorage } from "@/app/test/storage";

useMemoryStorage();

const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000 - 60_000).toISOString();

describe("DemoStrip", () => {
  it("says it is a demo with fictional patients, when it goes, and offers a clinic of their own", async () => {
    const { container } = render(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el" }} />);
    const strip = screen.getByRole("complementary", { name: "Κλινική δοκιμής" });
    expect(strip).toHaveTextContent("Φανταστικοί ασθενείς · διαγράφεται σε 7 μέρες");
    expect(within(strip).getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toBeInTheDocument();
    // Leaving ends the demo: the button's title says so.
    expect(within(strip).getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toHaveAttribute("title", expect.stringContaining("Η δοκιμή κλείνει"));
    await expectNoA11yViolations(container);
  });

  it("says what is left of the 5 programs and 5 recordings, pink when something ran out", () => {
    const { rerender } = render(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el", left: { of: 5, generate: 4, transcribe: 5 } }} />);
    const left = screen.getByText("Μένουν 4 από 5 προγράμματα και 5 από 5 ηχογραφήσεις");
    expect(left).not.toHaveClass("bg-tab-pink");
    rerender(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el", left: { of: 5, generate: 0, transcribe: 2 } }} />);
    expect(screen.getByText("Μένουν 0 από 5 προγράμματα και 2 από 5 ηχογραφήσεις")).toHaveClass("bg-tab-pink");
  });

  it("in English, and says the app's screens are still Greek", () => {
    render(<DemoStrip demo={{ expiresAt: inDays(1), lang: "en" }} />);
    const strip = screen.getByRole("complementary", { name: "Demo clinic" });
    expect(strip).toHaveAttribute("lang", "en");
    expect(strip).toHaveTextContent("deleted in 1 day");
    expect(strip).toHaveTextContent("screens are in Greek");
    expect(within(strip).getByRole("button", { name: /I want my own clinic/ })).toBeInTheDocument();
  });
});

const cardOf = (id: string, label: string, call: BoardCard["call"]): BoardCard => ({
  id, programId: `p-${id}`, roomId: "r1", slot: 1, label, title: "Πρόγραμμα", exercises: ["Άσκηση"],
  setsTarget: [3], setsDone: [1], current: 0, call, createdAt: new Date().toISOString(),
});
const andreas = cardOf("a1", "Ανδρέας Μ.", null);
let clinic = 0;
const guide = (over: Partial<React.ComponentProps<typeof DemoGuide>> = {}) => (
  <DemoGuide
    lang="el"
    clinicId={`c-${++clinic}`}
    initialCards={[andreas]}
    patientCard={{ id: "a1", href: "/s/tok" }}
    lastProgramAt={inDays(-2)}
    printHref="/programs/p1/print"
    diaryHref="/patients/a1"
    {...over}
  />
);
const sendBoard = (cards: BoardCard[]) => act(() => { window.dispatchEvent(new CustomEvent(BOARD_EVENT, { detail: cards })); });

describe("DemoGuide", () => {
  it("starts with a short introduction of PhysioPath and a pulsing «Ξεκινάμε»", async () => {
    const { container } = render(guide());
    const tour = screen.getByRole("region", { name: "Καλώς ήρθατε στο PhysioPath" });
    expect(tour).toHaveTextContent("Μιλάτε 30 δευτερόλεπτα στο τέλος της συνεδρίας.");
    expect(tour).toHaveTextContent("Εσείς αποφασίζετε και εγκρίνετε.");
    expect(within(tour).getByRole("button", { name: /Ξεκινάμε/ })).toHaveClass("tour-pulse");
    expect(tour).toHaveTextContent("3 βήματα, περίπου 2 λεπτά. Μετά: το ημερολόγιο στο σπίτι, πρότυπα, χαρτί για τον ασθενή.");
    await expectNoA11yViolations(container);
  });

  it("step 1 is a session by voice", async () => {
    render(guide());
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    const tour = screen.getByRole("region", { name: /Μιλάτε/ });
    expect(tour).toHaveTextContent("Βήμα 1 από 3");
    expect(tour).toHaveTextContent("Διαλέξτε τον Γιώργο Π.");
    expect(tour).not.toHaveTextContent("5 προγράμματα"); // the strip on top says what is left
    const link = within(tour).getByRole("link", { name: /Νέα συνεδρία με φωνή/ });
    expect(link).toHaveAttribute("href", "/notes/new");
    expect(link).toHaveClass("tour-pulse");
    // only the button to press pulses, not «Παράλειψη» or «Από την αρχή»
    expect(within(tour).getByRole("button", { name: "Παράλειψη" })).not.toHaveClass("tour-pulse");
  });

  it("after a program of their own: be the patient; a new call on the board leads to «Το είδα»; then the end", async () => {
    const props = { clinicId: `c-${++clinic}` };
    const { rerender } = render(guide(props));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    // the visitor approves a program: the board now has a newer one than the start of step 1
    rerender(guide({ ...props, lastProgramAt: new Date(Date.now() + 1000).toISOString() }));
    // step 1 is done (a program was approved): step 2 opens the patient's phone screen
    const two = screen.getByRole("region", { name: /Γίνετε ο ασθενής/ });
    expect(within(two).getByRole("link", { name: /Άνοιξε την οθόνη του ασθενή/ })).toHaveAttribute("href", "/s/tok");
    // the patient presses «Πονάω» on the phone: the board gets a new call
    sendBoard([{ ...andreas, call: { reason: "pain", at: new Date(Date.now() + 1000).toISOString() } }]);
    const three = screen.getByRole("region", { name: /Η αίθουσα σάς ειδοποιεί/ });
    expect(within(three).getByRole("link", { name: /Δείξε μου την κάρτα/ })).toHaveAttribute("href", "#patient-a1");
    // «Το είδα»: the call is gone
    sendBoard([andreas]);
    expect(screen.getByRole("region", { name: /Αυτό είναι το PhysioPath/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toBeInTheDocument();
  });

  it("step 3 also ends with «Το είδα» on another call (the demo's question card)", async () => {
    const helen = cardOf("h1", "Ελένη Κ.", { reason: "question", at: new Date(Date.now() - 60_000).toISOString() });
    const props = { clinicId: `c-${++clinic}`, initialCards: [andreas, helen] };
    const { rerender } = render(guide(props));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    rerender(guide({ ...props, lastProgramAt: new Date(Date.now() + 1000).toISOString() }));
    const call = { reason: "pain" as const, at: new Date(Date.now() + 1000).toISOString() };
    sendBoard([{ ...andreas, call }, helen]);
    expect(screen.getByRole("region", { name: /Η αίθουσα σάς ειδοποιεί/ })).toBeInTheDocument();
    // a board update that answers nothing keeps step 3
    sendBoard([{ ...andreas, call }, helen]);
    expect(screen.getByRole("region", { name: /Η αίθουσα σάς ειδοποιεί/ })).toBeInTheDocument();
    // «Το είδα» on Ελένη's question, not on the new call
    sendBoard([{ ...andreas, call }, { ...helen, call: null }]);
    expect(screen.getByRole("region", { name: /Αυτό είναι το PhysioPath/ })).toHaveTextContent("Ο φυσιοθεραπευτής αποφασίζει, το PhysioPath γράφει.");
  });

  it("closed sticky notes stay closed through the steps, and come back with «Από την αρχή»", async () => {
    const clinicId = `c-${++clinic}`;
    localStorage.setItem(`physiopath:demo-tour:${clinicId}`, JSON.stringify({ step: 1, since: new Date().toISOString(), notes: false }));
    render(guide({ clinicId }));
    await userEvent.click(await screen.findByRole("button", { name: "Παράλειψη" }));
    expect(JSON.parse(localStorage.getItem(`physiopath:demo-tour:${clinicId}`)!)).toMatchObject({ step: 2, notes: false });
    await userEvent.click(screen.getByRole("button", { name: "Από την αρχή" }));
    expect(JSON.parse(localStorage.getItem(`physiopath:demo-tour:${clinicId}`)!)).toEqual({ step: 0 });
  });

  it("«Παράλειψη» moves on, and an empty board offers to fill the room again", async () => {
    render(guide({ initialCards: [], patientCard: null }));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    await userEvent.click(screen.getByRole("button", { name: "Παράλειψη" }));
    expect(screen.getByRole("region", { name: /Γίνετε ο ασθενής/ })).toHaveTextContent("Βήμα 2 από 3");
    expect(screen.getByRole("button", { name: "Ξαναγέμισε την αίθουσα" })).toBeInTheDocument();
  });

  it("«Από την αρχή» goes back to the introduction, and step 1 waits for a new program", async () => {
    // a program the visitor made in an earlier round of the tour
    render(guide({ lastProgramAt: new Date(Date.now() - 60_000).toISOString() }));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    await userEvent.click(screen.getByRole("button", { name: "Παράλειψη" }));
    expect(screen.getByRole("region", { name: /Γίνετε ο ασθενής/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Από την αρχή" }));
    expect(screen.getByRole("region", { name: "Καλώς ήρθατε στο PhysioPath" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    // not skipped to step 2 by the old program
    expect(screen.getByRole("region", { name: /Μιλάτε/ })).toHaveTextContent("Βήμα 1 από 3");
  });

  it("the end offers «Δείτε και αυτά»: the home diary, templates, say your templates, the paper sheet; ✓ once opened", async () => {
    const clinicId = `c-${++clinic}`;
    localStorage.setItem(`physiopath:demo-tour:${clinicId}`, JSON.stringify({ step: 4, seen: ["templates", "nonsense"] }));
    const { container } = render(guide({ clinicId }));
    const extras = await screen.findByRole("list", { name: /Δείτε και αυτά/ });
    const items = within(extras).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("link").getAttribute("href"))).toEqual([
      "/patients/a1",
      "/templates",
      "/templates/dictate",
      "/programs/p1/print",
    ]);
    expect(items[0]).toHaveTextContent("Ημερολόγιο στο σπίτι");
    expect(items[0]).not.toHaveTextContent("Το είδατε");
    expect(items[1]).toHaveTextContent("Πρότυπα · Το είδατε");
    expect(items[2]).not.toHaveTextContent("Το είδατε");
    // still the main button: a clinic of their own
    expect(screen.getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toBeInTheDocument();
    // the paper sheet has no coach page: opening it from here ticks it
    within(items[3]).getByRole("link").addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(within(items[3]).getByRole("link", { name: /Χαρτί για τον ασθενή/ }));
    expect(items[3]).toHaveTextContent("Το είδατε");
    expect(JSON.parse(localStorage.getItem(`physiopath:demo-tour:${clinicId}`)!).seen).toEqual(["templates", "print"]);
    await expectNoA11yViolations(container);
  });

  it("without a program or a diary there is no sheet or diary to open; what was opened stays after «Ξανά από την αρχή»", async () => {
    const clinicId = `c-${++clinic}`;
    localStorage.setItem(`physiopath:demo-tour:${clinicId}`, JSON.stringify({ step: 4, seen: ["dictate"] }));
    render(guide({ clinicId, printHref: null, diaryHref: null }));
    const items = within(await screen.findByRole("list", { name: /Δείτε και αυτά/ })).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("link").getAttribute("href"))).toEqual(["/templates", "/templates/dictate"]);
    await userEvent.click(screen.getByRole("button", { name: "Ξανά από την αρχή" }));
    expect(JSON.parse(localStorage.getItem(`physiopath:demo-tour:${clinicId}`)!)).toEqual({ step: 0, seen: ["dictate"] });
  });

  it("in English", () => {
    render(guide({ lang: "en" }));
    expect(screen.getByRole("region", { name: "Welcome to PhysioPath" })).toHaveTextContent("You talk for 30 seconds at the end of the session.");
  });
});

describe("StaffSheet in a demo clinic", () => {
  it("shows the strip on top, «Έξοδος» instead of «Αποσύνδεση», and no clinic switcher or fake user", () => {
    render(
      <StaffSheet profile={{ role: "owner", full_name: "Φυσιοθεραπευτής (δοκιμή)", demo: { expiresAt: inDays(7), lang: "el" } }}>
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.getByRole("complementary", { name: "Κλινική δοκιμής" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Έξοδος" })).toBeInTheDocument();
    expect(screen.queryByText(/Υπεύθυνη\/ος/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Αποσύνδεση" })).toBeNull();
  });

  it("a real clinic: no strip, «Αποσύνδεση» as before", () => {
    render(
      <StaffSheet profile={{ role: "owner", full_name: "Μαρία", demo: null }}>
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.getByRole("button", { name: "Αποσύνδεση" })).toBeInTheDocument();
  });
});
