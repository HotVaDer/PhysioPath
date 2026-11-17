"use client";
// «Αποδοχή»: the invited person writes their name (how the team will see them) and joins the clinic.
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { acceptInvite, type FormState } from "@/app/lib/onboarding/actions";

export function AcceptForm({ token, name }: { token: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvite, {});
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert>{state.message}</FormAlert>
      <LineField
        id="fullName"
        name="fullName"
        label="Το ονοματεπώνυμό σας"
        hint="Έτσι θα σας βλέπει η υπόλοιπη ομάδα."
        autoComplete="name"
        defaultValue={state.values?.fullName ?? name}
        error={state.errors?.fullName}
        required
      />
      <Actions>
        <SubmitButton pending="Αποδοχή…">
          Αποδοχή <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
