import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addDays, localDay, longDayName, withChange, type LogChange, type LogEntry } from "@/app/lib/home/log";
import { ExerciseChecklist, type ChecklistExercise } from "@/app/p/[token]/ExerciseChecklist";
import { expectNoA11yViolations } from "@/app/test/axe";

const TOKEN = "3f0c2b9e-6a1d-4c8e-9b7a-1d2e3f4a5b6c";
const TODAY = localDay();
const YESTERDAY = addDays(TODAY, -1);
// The program's own numbers: 1 is a blank row the letter hides, so the second exercise on screen is 2.
const exercises: ChecklistExercise[] = [
  { index: 0, name: "Γέφυρα γλουτών", dose: ["3 σετ × 10 επαναλήψεις"], notes: null },
  { index: 2, name: "Διάταση γάμπας", dose: ["30 δευτερόλεπτα"], notes: "Στον τοίχο." },
  { index: 3, name: "Ισορροπία", dose: [], notes: null },
];

// A pretend server that keeps the diary as home_log does, and remembers what was sent.
let server: LogEntry[] = [];
let sent: LogChange[] = [];
let failNext = false;
beforeEach(() => {
  server = [];
  sent = [];
  failNext = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(`/api/p/${TOKEN}`);
      const change = JSON.parse(String(init.body)) as LogChange;
      sent.push(change);
      if (failNext) return new Response(JSON.stringify({ error: "x" }), { status: 500 });
      server = withChange(server, change);
      return Response.json({ status: "ok", log: server });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function show(props: Partial<Parameters<typeof ExerciseChecklist>[0]> = {}) {
  return render(
    <ExerciseChecklist
      token={TOKEN}
      exercises={exercises}
      log={server}
      today={TODAY}
      firstDay={addDays(TODAY, -3)}
      clinicPhone="25 000000"
      {...props}
    />,
  );
}

const done = (name: string, label = "Το έκανα σήμερα") => screen.getByRole("button", { name: `${label}: ${name}` });
const skipped = (name: string) => screen.getByRole("button", { name: `Δεν μπόρεσα: ${name}` });
const counter = () => screen.getByText(/από 3 ασκήσεις/);
const panel = (name: string) => screen.queryByRole("form", { name: `Πόνος και σημείωση: ${name}` });

describe("ExerciseChecklist", () => {
  it("«Το έκανα σήμερα» saves to the clinic's diary with the program's own number, then pain and a note", async () => {
    const user = userEvent.setup();
    const { container } = show();
    expect(screen.getByRole("region", { name: "Σήμερα" })).toBeInTheDocument();
    expect(counter()).toHaveTextContent("0 από 3 ασκήσεις");

    await user.click(done("Διάταση γάμπας"));
    expect(done("Διάταση γάμπας")).toHaveAttribute("aria-pressed", "true");
    expect(counter()).toHaveTextContent("1 από 3 ασκήσεις");
    expect(sent).toEqual([{ day: TODAY, exercise: 2, status: "done", pain: null, note: null }]);

    // The box for pain and a note opens under it.
    const box = panel("Διάταση γάμπας")!;
    expect(box).toBeInTheDocument();
    await expectNoA11yViolations(container);
    await user.click(within(box).getByRole("radio", { name: "3 από 10" }));
    await user.type(within(box).getByLabelText(/Σημείωση/), "λίγο τράβηγμα");
    await user.click(within(box).getByRole("button", { name: "Αποθήκευση" }));

    expect(sent.at(-1)).toEqual({ day: TODAY, exercise: 2, status: "done", pain: 3, note: "λίγο τράβηγμα" });
    expect(panel("Διάταση γάμπας")).not.toBeInTheDocument();
    expect(screen.getByText("Πόνος 3 από 10")).toBeInTheDocument();
    expect(screen.getByText("«λίγο τράβηγμα»")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Αλλαγή: Διάταση γάμπας" })).toBeInTheDocument();
    expect(container).toHaveTextContent("Ό,τι σημειώνετε εδώ το βλέπει ο φυσιοθεραπευτής σας.");
  });

  it("pressing the same button again takes it back", async () => {
    const user = userEvent.setup();
    show();
    await user.click(done("Ισορροπία"));
    await user.click(done("Ισορροπία"));
    expect(done("Ισορροπία")).toHaveAttribute("aria-pressed", "false");
    expect(sent.at(-1)).toEqual({ day: TODAY, exercise: 3, status: null, pain: null, note: null });
    expect(server).toEqual([]);
    expect(panel("Ισορροπία")).not.toBeInTheDocument();
  });

  it("«Δεν μπόρεσα» with a high pain shows the clinic's phone", async () => {
    const user = userEvent.setup();
    show();
    await user.click(skipped("Γέφυρα γλουτών"));
    expect(skipped("Γέφυρα γλουτών")).toHaveAttribute("aria-pressed", "true");
    expect(counter()).toHaveTextContent("0 από 3 ασκήσεις"); // only «Το έκανα» counts
    await user.click(within(panel("Γέφυρα γλουτών")!).getByRole("radio", { name: "8 από 10" }));
    await user.click(screen.getByRole("button", { name: "Αποθήκευση" }));
    expect(sent.at(-1)).toMatchObject({ exercise: 0, status: "skipped", pain: 8 });
    expect(screen.getByText("Ο πόνος είναι δυνατός.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Καλέστε μας, 25 000000" })).toHaveAttribute("href", "tel:25000000");
  });

  it("switching from «Το έκανα» to «Δεν μπόρεσα» keeps the pain and note already given", async () => {
    server = [{ day: TODAY, exercise: 0, status: "done", pain: 4, note: "κούραση" }];
    const user = userEvent.setup();
    show();
    await user.click(skipped("Γέφυρα γλουτών"));
    expect(sent.at(-1)).toEqual({ day: TODAY, exercise: 0, status: "skipped", pain: 4, note: "κούραση" });
  });

  it("when it can't be saved, the press is taken back and the page says so", async () => {
    failNext = true;
    const user = userEvent.setup();
    show();
    await user.click(done("Ισορροπία"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.");
    expect(done("Ισορροπία")).toHaveAttribute("aria-pressed", "false");
    expect(counter()).toHaveTextContent("0 από 3 ασκήσεις");
  });

  it("opens with what was already saved today, and says «Μπράβο» when all are done", async () => {
    server = [
      { day: TODAY, exercise: 0, status: "done", pain: null, note: null },
      { day: TODAY, exercise: 3, status: "done", pain: null, note: null },
      { day: YESTERDAY, exercise: 2, status: "done", pain: null, note: null }, // another day: not today's
    ];
    const user = userEvent.setup();
    show();
    expect(done("Γέφυρα γλουτών")).toHaveAttribute("aria-pressed", "true");
    expect(done("Διάταση γάμπας")).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(done("Διάταση γάμπας"));
    expect(screen.getByRole("status")).toHaveTextContent("Μπράβο! Κάνατε όλες τις ασκήσεις σήμερα.");
  });

  it("an earlier day can be chosen and ticked, then back to today", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: `${longDayName(YESTERDAY)}: 0 από 3` }));
    expect(screen.getByRole("heading", { level: 2, name: longDayName(YESTERDAY) })).toBeInTheDocument();
    await user.click(done("Ισορροπία", "Το έκανα"));
    expect(sent.at(-1)).toMatchObject({ day: YESTERDAY, exercise: 3, status: "done" });
    expect(screen.getByRole("button", { name: `${longDayName(YESTERDAY)}: 1 από 3` })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Πίσω στο σήμερα" }));
    expect(screen.getByRole("heading", { level: 2, name: "Σήμερα" })).toBeInTheDocument();
    expect(done("Ισορροπία")).toHaveAttribute("aria-pressed", "false");
  });
});
