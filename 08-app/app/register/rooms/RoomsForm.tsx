"use client";
// §2 Χώροι: the ledger. One row per room with − / + counters for beds and exercise stations,
// a total under a double line, "+ Προσθήκη γραμμής". The rows travel to the server as JSON
// and are checked there again (saveRooms).
import { useActionState, useState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { saveRooms, type FormState } from "@/app/lib/onboarding/actions";

type Room = { name: string; beds: number; stations: number };
const MAX = 40;

const counterButton =
  "h-11 w-11 cursor-pointer border-2 border-ink bg-sheet font-typed text-[22px] text-ink disabled:cursor-not-allowed disabled:opacity-40";

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <span role="group" aria-label={label} className="flex items-center justify-center gap-2">
      <button type="button" aria-label={`${label}: ένα λιγότερο`} className={counterButton} disabled={value <= 0} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite" className="min-w-8 text-center font-typed text-[22px] font-bold">
        {value}
      </output>
      <button type="button" aria-label={`${label}: ένα περισσότερο`} className={counterButton} disabled={value >= MAX} onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}

export function RoomsForm({ initial }: { initial: Room[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveRooms, {});
  const [rooms, setRooms] = useState<Room[]>(initial.length ? initial : [{ name: "Αίθουσα 1", beds: 1, stations: 0 }]);
  const e = state.errors ?? {};

  const update = (i: number, patch: Partial<Room>) => setRooms((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const beds = rooms.reduce((a, r) => a + r.beds, 0);
  const stations = rooms.reduce((a, r) => a + r.stations, 0);
  const slots = beds + stations;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="rooms" value={JSON.stringify(rooms)} />
      <FormAlert>{state.message}</FormAlert>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-[17px]">
          <thead>
            <tr className="border-b-2 border-ink text-[15px]">
              <th scope="col" className="w-12 px-1.5 py-2 text-left font-semibold">Α/Α</th>
              <th scope="col" className="px-1.5 py-2 text-left font-semibold">Χώρος</th>
              <th scope="col" className="w-[150px] px-1.5 py-2 text-center font-semibold">Κρεβάτια</th>
              <th scope="col" className="w-[150px] px-1.5 py-2 text-center font-semibold">Θέσεις άσκησης</th>
              <th scope="col" className="w-12 px-1.5 py-2"><span className="sr-only">Αφαίρεση</span></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, i) => {
              const nameError = e[`${i}.name`];
              const countError = e[`${i}.beds`] ?? e[`${i}.stations`];
              const label = room.name.trim() || `χώρος ${i + 1}`;
              return (
                <tr key={i} className="border-b border-ledger align-top">
                  <td className="px-1.5 py-2.5 font-typed font-bold">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-1.5 py-1.5">
                    <input
                      type="text"
                      aria-label={`Όνομα χώρου ${i + 1}`}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={nameError || countError ? `room-${i}-error` : undefined}
                      value={room.name}
                      maxLength={40}
                      onChange={(ev) => update(i, { name: ev.target.value })}
                      className={`min-h-11 w-full border-0 border-b-2 bg-transparent px-1 font-typed text-[19px] text-ink ${nameError ? "border-error" : "border-line"}`}
                    />
                    {(nameError || countError) && (
                      <p id={`room-${i}-error`} className="pt-1 text-[15px] font-semibold text-error">
                        {nameError ?? countError}
                      </p>
                    )}
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Counter label={`Κρεβάτια στο ${label}`} value={room.beds} onChange={(beds) => update(i, { beds })} />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Counter label={`Θέσεις στο ${label}`} value={room.stations} onChange={(stations) => update(i, { stations })} />
                  </td>
                  <td className="px-1.5 py-1.5 text-center">
                    {rooms.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Αφαίρεση γραμμής ${label}`}
                        className="h-11 w-11 cursor-pointer font-typed text-[22px] text-muted hover:text-ink"
                        onClick={() => setRooms((rs) => rs.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td />
              <td colSpan={4} className="px-1.5 py-1.5">
                {rooms.length < 30 && (
                  <button
                    type="button"
                    className="min-h-11 cursor-pointer font-semibold text-action underline underline-offset-[3px] hover:text-ink"
                    onClick={() => setRooms((rs) => [...rs, { name: `Χώρος ${rs.length + 1}`, beds: 0, stations: 1 }])}
                  >
                    + Προσθήκη γραμμής
                  </button>
                )}
              </td>
            </tr>
            <tr className="border-t-[3px] border-double border-ink">
              <td />
              <th scope="row" className="px-1.5 py-2.5 text-left font-bold">Σύνολο</th>
              <td className="px-1.5 py-2.5 text-center font-typed text-[22px] font-bold">{beds}</td>
              <td className="px-1.5 py-2.5 text-center font-typed text-[22px] font-bold">{stations}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="italic text-muted" aria-live="polite">
        Ο πίνακας της αίθουσας θα έχει {slots} {slots === 1 ? "υποδοχή" : "υποδοχές"} σε {rooms.length}{" "}
        {rooms.length === 1 ? "χώρο" : "χώρους"}.
      </p>
      <Actions>
        <SubmitButton pending="Αποθήκευση…">
          Συνέχεια στο §3 <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
