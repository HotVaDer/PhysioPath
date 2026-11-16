"use client";
// Ρυθμίσεις → Χώροι: one card per room (its name, then − / + for beds and exercise stations),
// «+ Προσθήκη χώρου», and «Αποθήκευση». Cards stack on a phone: no table wider than the screen.
// Nothing changes until «Αποθήκευση»; then the whole list goes to the server as JSON (save_rooms).
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { Counter } from "@/app/components/paper/Counter";
import { fieldBox } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import type { FormState } from "@/app/lib/onboarding/actions";
import type { SettingsRoom } from "@/app/lib/onboarding/schema";
import { saveRooms } from "@/app/lib/settings/actions";
import { cx } from "@/app/lib/cx";

// k: a key for React only, so removing a card doesn't mix up the ones after it.
type Card = SettingsRoom & { k: number };
const MAX_ROOMS = 30;

export function RoomsForm({ initial }: { initial: SettingsRoom[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveRooms, {});
  const nextKey = useRef(initial.length);
  const [rooms, setRooms] = useState<Card[]>(initial.map((r, k) => ({ ...r, k })));
  const e = state.errors ?? {};

  const update = (k: number, patch: Partial<SettingsRoom>) => setRooms((rs) => rs.map((r) => (r.k === k ? { ...r, ...patch } : r)));

  // A new card: put the cursor in its name, so it's clear where it went.
  const list = useRef<HTMLOListElement>(null);
  const added = useRef(false);
  useEffect(() => {
    if (!added.current) return;
    added.current = false;
    const inputs = list.current?.querySelectorAll<HTMLInputElement>("input[type=text]");
    const last = inputs?.[inputs.length - 1];
    last?.focus();
    last?.select();
  }, [rooms.length]);

  // After a failed «Αποθήκευση», go to the first room with a problem (or the message at the top).
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message && !state.errors) return;
    const target = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]');
    target?.scrollIntoView({ block: "center" });
    if (target?.matches("input")) target.focus();
  }, [state]);

  function add() {
    added.current = true;
    setRooms((rs) => [...rs, { k: nextKey.current++, name: `Χώρος ${rs.length + 1}`, beds: 1, stations: 0 }]);
  }

  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="rooms" value={JSON.stringify(rooms.map(({ k: _, ...r }) => r))} />
      <FormAlert>{state.message}</FormAlert>
      {e.form && <FormAlert>{e.form}</FormAlert>}

      <ol ref={list} className="flex flex-col gap-4">
        {rooms.map((room, i) => {
          const id = `room-${room.k}`;
          const nameError = e[`${i}.name`];
          const countError = e[`${i}.beds`] ?? e[`${i}.stations`];
          const label = room.name.trim() || `χώρος ${i + 1}`;
          return (
            <li
              key={room.k}
              className={cx(
                "flex flex-col gap-3.5 rounded-md px-4 pb-4 pt-3 sm:px-5",
                nameError || countError ? "border-[3px] border-error" : "border-2 border-hairline",
              )}
            >
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                  <label htmlFor={`${id}-name`} className="text-[19px] font-semibold">
                    Όνομα χώρου
                  </label>
                  <input
                    id={`${id}-name`}
                    type="text"
                    value={room.name}
                    maxLength={40}
                    onChange={(ev) => update(room.k, { name: ev.target.value })}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError || countError ? `${id}-error` : undefined}
                    className={fieldBox(nameError)}
                  />
                </div>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRooms((rs) => rs.filter((r) => r.k !== room.k))}
                    className="min-h-[52px] cursor-pointer px-1 text-action underline underline-offset-[3px] hover:text-ink"
                  >
                    Αφαίρεση<span className="sr-only"> του χώρου «{label}»</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Κρεβάτια</p>
                  <Counter label={`Κρεβάτια στο «${label}»`} value={room.beds} onChange={(beds) => update(room.k, { beds })} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Θέσεις άσκησης</p>
                  <Counter label={`Θέσεις άσκησης στο «${label}»`} value={room.stations} onChange={(stations) => update(room.k, { stations })} />
                </div>
              </div>

              {(nameError || countError) && (
                <p id={`${id}-error`} className="font-semibold text-error">
                  Πρόβλημα: {nameError ?? countError}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {rooms.length < MAX_ROOMS && (
        <button
          type="button"
          onClick={add}
          className="min-h-[52px] cursor-pointer self-start border-2 border-action bg-white px-5 font-bold text-action hover:bg-note-green"
        >
          <span aria-hidden="true">+</span> Προσθήκη χώρου
        </button>
      )}

      <div className="border-t-2 border-hairline pt-4">
        <Actions>
          <SubmitButton pending="Αποθήκευση…">Αποθήκευση</SubmitButton>
          <Link href="/" className="min-h-11 content-center">
            Ακύρωση
          </Link>
        </Actions>
      </div>
    </form>
  );
}
