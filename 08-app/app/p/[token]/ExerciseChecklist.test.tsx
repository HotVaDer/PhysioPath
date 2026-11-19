import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExerciseChecklist, type ChecklistExercise } from "@/app/p/[token]/ExerciseChecklist";
import { loadTicks, ticksKey, today } from "@/app/p/[token]/ticks";
import { expectNoA11yViolations } from "@/app/test/axe";
import { memoryStorage, useMemoryStorage } from "@/app/test/storage";

const TOKEN = "3f0c2b9e-6a1d-4c8e-9b7a-1d2e3f4a5b6c";
const exercises: ChecklistExercise[] = [
  { name: "Γέφυρα γλουτών", dose: ["3 σετ × 10 επαναλήψεις"], notes: null },
  { name: "Διάταση γάμπας", dose: ["30 δευτερόλεπτα"], notes: "Στον τοίχο." },
  { name: "Ισορροπία", dose: [], notes: null },
];

const tick = (name: string) => screen.getByRole("button", { name: `Το έκανα σήμερα: ${name}` });
const counter = () => screen.getByText(/από 3 ασκήσεις/);

useMemoryStorage();
afterEach(() => vi.restoreAllMocks());

describe("ExerciseChecklist", () => {
  it("ticks an exercise for today, says how many are done and keeps it only in this browser", async () => {
    const user = userEvent.setup();
    const { container } = render(<ExerciseChecklist token={TOKEN} exercises={exercises} />);
    expect(screen.getByRole("region", { name: "Σήμερα" })).toBeInTheDocument();
    expect(counter()).toHaveTextContent("0 από 3 ασκήσεις");

    await user.click(tick("Διάταση γάμπας"));
    expect(tick("Διάταση γάμπας")).toHaveAttribute("aria-pressed", "true");
    expect(tick("Γέφυρα γλουτών")).toHaveAttribute("aria-pressed", "false");
    expect(counter()).toHaveTextContent("1 από 3 ασκήσεις");
    expect(window.localStorage.getItem(ticksKey(TOKEN, today()))).toBe("[1]");

    await user.click(tick("Διάταση γάμπας")); // a second press takes it back
    expect(tick("Διάταση γάμπας")).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(ticksKey(TOKEN, today()))).toBe("[]");
    await expectNoA11yViolations(container);
  });

  it("shows today's saved ticks when opened again, and says «Μπράβο» when all are done", async () => {
    window.localStorage.setItem(ticksKey(TOKEN, today()), "[0,2]");
    const user = userEvent.setup();
    render(<ExerciseChecklist token={TOKEN} exercises={exercises} />);
    expect(tick("Γέφυρα γλουτών")).toHaveAttribute("aria-pressed", "true");
    expect(tick("Ισορροπία")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(tick("Διάταση γάμπας"));
    expect(screen.getByRole("status")).toHaveTextContent("Μπράβο! Κάνατε όλες τις ασκήσεις σήμερα.");
  });

  it("still works when the browser won't store anything (private mode)", async () => {
    const blocked = memoryStorage();
    blocked.setItem = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("localStorage", blocked);
    const user = userEvent.setup();
    render(<ExerciseChecklist token={TOKEN} exercises={exercises} />);
    await user.click(tick("Ισορροπία"));
    // Nothing could be saved, but the tick shows until the page is closed, and no error reaches the patient.
    expect(tick("Ισορροπία")).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(ticksKey(TOKEN, today()))).toBeNull();
  });
});

describe("ticks", () => {
  it("keeps one list per link and day, forgets other days of the same link, and ignores junk", () => {
    window.localStorage.setItem(ticksKey(TOKEN, "2026-11-17"), "[0]");
    window.localStorage.setItem(ticksKey("another-link", "2026-11-17"), "[0]");
    window.localStorage.setItem(ticksKey(TOKEN, "2026-11-18"), JSON.stringify([2, 2, 0, 7, -1, 1.5, "1"]));

    expect(loadTicks(TOKEN, "2026-11-18", 3)).toEqual([0, 2]);
    expect(window.localStorage.getItem(ticksKey(TOKEN, "2026-11-17"))).toBeNull();
    expect(window.localStorage.getItem(ticksKey("another-link", "2026-11-17"))).toBe("[0]");
  });

  it("reads broken data as nothing ticked", () => {
    window.localStorage.setItem(ticksKey(TOKEN, "2026-11-18"), "{not json");
    expect(loadTicks(TOKEN, "2026-11-18", 3)).toEqual([]);
  });

  it("writes the day as YYYY-MM-DD in local time", () => {
    expect(today(new Date(2026, 10, 18, 23, 30))).toBe("2026-11-18");
  });
});
