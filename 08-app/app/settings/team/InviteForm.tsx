"use client";
// Ρυθμίσεις → Ομάδα: invite one person: their email, what they'll do (two big choice cards, each
// saying what that person can see), and «Αποστολή πρόσκλησης». One person per press, so an email
// typed but never "added" can't be lost (the trap in the old sign-up step, review 2026-11-16).
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import type { FormState } from "@/app/lib/onboarding/actions";
import { ROLES, type Role } from "@/app/lib/onboarding/schema";
import { inviteMember } from "@/app/lib/settings/actions";
import { cx } from "@/app/lib/cx";

// Assistant first and chosen by default: it sees the least (no clinical notes).
const CHOICES: { role: Role; text: string }[] = [
  { role: "assistant", text: "Βλέπει την αίθουσα, απαντά όταν καλεί ασθενής και δίνει στον ασθενή το πρόγραμμά του. Δεν βλέπει κλινικές σημειώσεις." },
  { role: "physio", text: "Ηχογραφεί, ελέγχει και εγκρίνει σημειώσεις και προγράμματα. Τίποτα δεν φτάνει στον ασθενή χωρίς την έγκρισή του." },
];

// clinicId: the clinic this page was opened for (requireSameClinic on the server).
export function InviteForm({ clinicId }: { clinicId: string }) {
  const [state, action] = useActionState<FormState, FormData>(inviteMember, {});
  const chosen = (state.values?.role as Role | undefined) ?? "assistant";

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="clinicId" value={clinicId} />
      <FormAlert>{state.message}</FormAlert>
      <LineField
        id="email"
        name="email"
        type="email"
        label="Το email του"
        hint="Θα του στείλουμε ένα email με ένα κουμπί για να μπει."
        autoComplete="off"
        spellCheck={false}
        inputMode="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
        // A new key after each error keeps the typed email (React clears a sent form).
        key={state.values?.email ?? ""}
      />

      <fieldset className="flex flex-col gap-2" aria-describedby={state.errors?.role ? "role-error" : undefined}>
        <legend className="pb-1 text-[19px] font-semibold">Τι θα κάνει στην κλινική;</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHOICES.map((c) => (
            <label
              key={c.role}
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-md border-2 border-line bg-white px-4 py-3.5",
                "has-[:checked]:border-[3px] has-[:checked]:border-action has-[:checked]:bg-note-green",
              )}
            >
              <input
                type="radio"
                name="role"
                value={c.role}
                defaultChecked={c.role === chosen}
                className="mt-1 h-6 w-6 flex-none cursor-pointer accent-action"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[19px] font-bold">{ROLES[c.role]}</span>
                <span className="text-base">{c.text}</span>
              </span>
            </label>
          ))}
        </div>
        {state.errors?.role && (
          <p id="role-error" className="font-semibold text-error">
            Πρόβλημα: {state.errors.role}
          </p>
        )}
      </fieldset>

      <Actions>
        <SubmitButton pending="Αποστολή…">Αποστολή πρόσκλησης</SubmitButton>
      </Actions>
    </form>
  );
}
