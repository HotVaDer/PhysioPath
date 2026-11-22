"use client";
// «Οι τελευταίες 7 μέρες»: a row of 7 day boxes, oldest on the left, today on the right. Each says how
// the day went (✓ all done, «2/4» some, «–» nothing) and is a button: pressing a day shows its
// exercises below, so a day the patient forgot to tick can still be ticked. Days before the program
// was given can't be chosen (the database would refuse them too). Not printed.
import { cx } from "@/app/lib/cx";
import { dayNumber, doneOn, longDayName, shortWeekday, type LogEntry } from "@/app/lib/home/log";

type Props = {
  days: string[]; // YYYY-MM-DD, oldest first, the last one is today
  today: string;
  selected: string;
  firstDay: string; // the day the program was given
  log: LogEntry[];
  exercises: number[]; // the program's numbers of the exercises on the letter
  onSelect: (day: string) => void;
};

export function PastDays({ days, today, selected, firstDay, log, exercises, onSelect }: Props) {
  const total = exercises.length;
  return (
    <section aria-labelledby="past-days-title" className="flex flex-col gap-2.5 print:hidden">
      <h2 id="past-days-title" className="font-bold">
        Οι τελευταίες 7 μέρες
      </h2>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const before = day < firstDay;
          const done = doneOn(log, day, exercises);
          const all = total > 0 && done === total;
          const isSelected = day === selected;
          const summary = before ? "πριν το πρόγραμμα" : `${done} από ${total}`;
          return (
            <li key={day}>
              <button
                type="button"
                disabled={before}
                aria-pressed={isSelected}
                aria-label={`${day === today ? "Σήμερα, " : ""}${longDayName(day)}: ${summary}`}
                onClick={() => onSelect(day)}
                className={cx(
                  "flex min-h-[4.5rem] w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-2 px-0.5 py-1.5 leading-tight disabled:cursor-default",
                  isSelected ? "border-action" : "border-transparent",
                  before ? "bg-transparent text-muted" : all ? "bg-note-green" : "bg-white",
                )}
              >
                <span className="text-[0.85rem]">{day === today ? "Σήμ." : shortWeekday(day)}</span>
                <span className="font-display text-[1.1rem]">{dayNumber(day)}</span>
                <span aria-hidden="true" className={cx("text-[0.85rem] font-bold", all ? "text-action" : "text-ink")}>
                  {before ? "" : all ? "✓" : done > 0 ? `${done}/${total}` : "–"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
