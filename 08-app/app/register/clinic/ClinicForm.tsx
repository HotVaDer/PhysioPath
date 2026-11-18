"use client";
// Sign-up, step 3: the clinic, how many beds, the agreement, and «Ολοκλήρωση εγγραφής».
// Rooms, exercise stations and the team come later, from the home page («Επόμενα βήματα»).
// The same form opens a second clinic («Νέα κλινική», mode "new"): never asks the name or the beds
// (its rooms are set up afterwards), and «Δημιουργία κλινικής» instead.
// The fields refill after an error (React clears a form once it's sent).
import { useActionState, useEffect, useRef, useState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { Counter } from "@/app/components/paper/Counter";
import { LineField, LineSelect } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { createClinic } from "@/app/lib/clinics/actions";
import { finishRegistration, type FormState } from "@/app/lib/onboarding/actions";
import { CITIES } from "@/app/lib/onboarding/schema";
import { cx } from "@/app/lib/cx";

type Initial = { ownerName?: string; clinicName?: string; city?: string; phone?: string; beds?: number };

export function ClinicForm({ initial, mode = "register" }: { initial: Initial; mode?: "register" | "new" }) {
  const [state, action] = useActionState<FormState, FormData>(mode === "new" ? createClinic : finishRegistration, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};
  const [beds, setBeds] = useState(Number(v.beds) || initial.beds || 1);
  // The name from step 1 is reused; ask only if the account has none (and never for a second clinic).
  const askName = mode === "register" && !initial.ownerName;

  // After a failed «Ολοκλήρωση», go to the first field with a problem, so it is in view even on a
  // small screen (the error is read out with it).
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.errors) return;
    const first = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.focus();
    first?.scrollIntoView({ block: "center" });
  }, [state]);

  return (
    // One column on a phone; two on a laptop, so the whole step fits one screen.
    <form ref={form} action={action} noValidate className="grid gap-x-10 gap-y-3.5 lg:grid-cols-2">
      {/* Only when no field shows its own error (e.g. the database said no): otherwise it just repeats them. */}
      {state.message && Object.keys(e).length === 0 && (
        <div className="lg:col-span-2">
          <FormAlert>{state.message}</FormAlert>
        </div>
      )}
      <LineField
        id="clinicName"
        name="clinicName"
        label="Όνομα κλινικής"
        autoComplete="organization"
        defaultValue={v.clinicName}
        error={e.clinicName}
        required
      />
      <LineSelect id="city" name="city" label="Πόλη" defaultValue={v.city ?? "Λεμεσός"} error={e.city}>
        {CITIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </LineSelect>
      <LineField
        id="phone"
        name="phone"
        type="tel"
        label="Τηλέφωνο για τους ασθενείς"
        autoComplete="tel"
        inputMode="tel"
        width="max-w-[300px]"
        defaultValue={v.phone}
        error={e.phone}
        hint="Το βλέπουν οι ασθενείς, για να σας καλέσουν."
        required
      />
      {askName && (
        <LineField
          id="ownerName"
          name="ownerName"
          label="Το ονοματεπώνυμό σας"
          autoComplete="name"
          defaultValue={v.ownerName}
          error={e.ownerName}
          required
        />
      )}

      {/* Only in sign-up: a second clinic sets its rooms and beds afterwards, from «Επόμενα βήματα». */}
      {mode === "register" && (
        <div className="flex flex-col gap-1">
          <p id="beds-label" className="text-[19px] font-semibold">
            Πόσα κρεβάτια θεραπείας έχετε;
          </p>
          <p id="beds-hint" className="text-muted">
            Όλα μαζί. Τις αίθουσες τις ρυθμίζετε μετά.
          </p>
          <input type="hidden" name="beds" value={beds} />
          <Counter label="Κρεβάτια θεραπείας" value={beds} onChange={setBeds} min={1} describedBy="beds-hint" className="pt-0.5" />
          {e.beds && <p className="font-semibold text-error">Πρόβλημα: {e.beds}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1 lg:col-span-2">
        <label
          className={cx(
            "flex cursor-pointer items-start gap-3.5 rounded-md bg-white px-4 py-3",
            e.consent ? "border-[3px] border-error" : "border-2 border-line",
          )}
        >
          <input
            type="checkbox"
            name="consent"
            aria-invalid={e.consent ? true : undefined}
            aria-describedby={e.consent ? "consent-error" : undefined}
            className="mt-0.5 h-7 w-7 flex-none cursor-pointer accent-action"
          />
          <span>Συμφωνώ με τους όρους χρήσης. Τα δεδομένα των ασθενών ανήκουν στην κλινική μου.</span>
        </label>
        {e.consent && (
          <p id="consent-error" className="font-semibold text-error">
            Πρόβλημα: {e.consent}
          </p>
        )}
      </div>

      {/* The button, with «Τι σημαίνει αυτό;» beside it (it opens onto its own line underneath). */}
      <div className="lg:col-span-2">
        <Actions>
          {mode === "new" ? (
            <SubmitButton pending="Δημιουργία…">Δημιουργία κλινικής</SubmitButton>
          ) : (
            <SubmitButton pending="Ολοκλήρωση…">Ολοκλήρωση εγγραφής</SubmitButton>
          )}
          <details className="text-muted">
            <summary className="flex min-h-11 cursor-pointer items-center text-action underline underline-offset-[3px]">
              Τι σημαίνει η συμφωνία;
            </summary>
            <p className="max-w-[60ch] pb-1">
              Η κλινική σας είναι υπεύθυνη για τα δεδομένα των ασθενών της. Η PhysioPath τα επεξεργάζεται μόνο για λογαριασμό
              της κλινικής, σε διακομιστές στην Ευρωπαϊκή Ένωση, και δεν τα χρησιμοποιεί για τίποτα άλλο.
            </p>
          </details>
        </Actions>
      </div>
    </form>
  );
}
