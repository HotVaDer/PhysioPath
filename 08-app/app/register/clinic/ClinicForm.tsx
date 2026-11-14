"use client";
// §1 Στοιχεία κλινικής: the fields, refilled from the draft, with errors next to each one.
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { LineField, LineSelect } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { saveClinic, type FormState } from "@/app/lib/onboarding/actions";
import { CITIES } from "@/app/lib/onboarding/schema";

type Initial = { ownerName?: string; clinicName?: string; city?: string; phone?: string };

export function ClinicForm({ initial }: { initial: Initial }) {
  const [state, action] = useActionState<FormState, FormData>(saveClinic, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.message}</FormAlert>
      <LineField
        id="clinicName"
        name="clinicName"
        number="1.1"
        label="Επωνυμία"
        autoComplete="organization"
        defaultValue={v.clinicName}
        error={e.clinicName}
        className="font-bold sm:text-[22px]"
        required
      />
      <LineSelect id="city" name="city" number="1.2" label="Πόλη" defaultValue={v.city ?? "Λεμεσός"} error={e.city}>
        {CITIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </LineSelect>
      <LineField
        id="phone"
        name="phone"
        type="tel"
        number="1.3"
        label="Τηλέφωνο για ασθενείς"
        autoComplete="tel"
        inputMode="tel"
        width="max-w-[240px]"
        defaultValue={v.phone}
        error={e.phone}
        hint="Τυπώνεται στο πρόγραμμα του ασθενή, κάτω από «Πάρτε μας τηλέφωνο αν»."
        required
      />
      <LineField
        id="ownerName"
        name="ownerName"
        number="1.4"
        label="Υπεύθυνη / Υπεύθυνος"
        autoComplete="name"
        defaultValue={v.ownerName}
        error={e.ownerName}
        required
      />
      <Actions>
        <SubmitButton pending="Αποθήκευση…">
          Συνέχεια στο §2 <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
