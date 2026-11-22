import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { lastDays, longDayName, type LogEntry } from "@/app/lib/home/log";
import { PastDays } from "@/app/p/[token]/PastDays";
import { expectNoA11yViolations } from "@/app/test/axe";

const TODAY = "2026-11-24";
const days = lastDays(TODAY); // 18 … 24 November
const log: LogEntry[] = [
  { day: "2026-11-23", exercise: 0, status: "done", pain: null, note: null },
  { day: "2026-11-23", exercise: 2, status: "done", pain: null, note: null },
  { day: "2026-11-22", exercise: 0, status: "done", pain: null, note: null },
  { day: "2026-11-22", exercise: 2, status: "skipped", pain: 5, note: null },
];

describe("PastDays", () => {
  it("shows 7 days, oldest first: all done, some, none, and the days before the program can't be chosen", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <PastDays days={days} today={TODAY} selected={TODAY} firstDay="2026-11-21" log={log} exercises={[0, 2]} onSelect={onSelect} />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      `${longDayName("2026-11-18")}: πριν το πρόγραμμα`,
      `${longDayName("2026-11-19")}: πριν το πρόγραμμα`,
      `${longDayName("2026-11-20")}: πριν το πρόγραμμα`,
      `${longDayName("2026-11-21")}: 0 από 2`,
      `${longDayName("2026-11-22")}: 1 από 2`,
      `${longDayName("2026-11-23")}: 2 από 2`,
      `Σήμερα, ${longDayName("2026-11-24")}: 0 από 2`,
    ]);
    expect(buttons[0]).toBeDisabled();
    expect(buttons[6]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[5]).toHaveTextContent("✓");
    expect(buttons[4]).toHaveTextContent("1/2");
    expect(buttons[3]).toHaveTextContent("–");

    await user.click(buttons[4]);
    expect(onSelect).toHaveBeenCalledWith("2026-11-22");
    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    await expectNoA11yViolations(container);
  });
});
