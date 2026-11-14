"use client";
// §4: the agreement, the signature line and «Υπογραφή και κατάθεση».
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { fileRegistration, type FormState } from "@/app/lib/onboarding/actions";

export function SignForm({ ownerName, date }: { ownerName: string; date: string }) {
  const [state, action] = useActionState<FormState, FormData>(fileRegistration, {});
  const consentError = state.errors?.consent;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.message}</FormAlert>
      <div className="flex max-w-[64ch] flex-col gap-1.5 pt-2">
        <label className="flex cursor-pointer items-start gap-3.5">
          <input
            type="checkbox"
            name="consent"
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? "consent-error" : undefined}
            className="mt-1 h-6 w-6 flex-none accent-action"
          />
          <span>
            Δηλώνω ότι συμφωνώ με τους Όρους χρήσης και τη Σύμβαση επεξεργασίας δεδομένων. Η κλινική είναι υπεύθυνη για τα
            δεδομένα των ασθενών της· η PhysioPath τα επεξεργάζεται μόνο για λογαριασμό της, σε διακομιστές στην ΕΕ.
          </span>
        </label>
        {consentError && (
          <p id="consent-error" className="pl-10 font-semibold text-error">
            {consentError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-5 pt-4">
        <div className="flex flex-[1_1_300px] flex-col gap-0.5">
          <span className="min-h-10 px-1 text-[30px] italic leading-tight">{ownerName}</span>
          <span className="border-t-2 border-line pt-1 text-[15px] text-muted">Η υπογραφή της υπεύθυνης / του υπευθύνου</span>
        </div>
        <div className="flex flex-[0_1_180px] flex-col gap-0.5">
          <span className="px-1 font-typed text-xl">{date}</span>
          <span className="border-t-2 border-line pt-1 text-[15px] text-muted">Ημερομηνία</span>
        </div>
      </div>

      <Actions>
        <SubmitButton pending="Κατάθεση…">Υπογραφή και κατάθεση</SubmitButton>
      </Actions>
    </form>
  );
}
