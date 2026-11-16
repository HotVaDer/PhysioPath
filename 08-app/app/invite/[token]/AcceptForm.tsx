"use client";
// «Αποδοχή πρόσκλησης»: the invitee types their name and joins the clinic.
import { useActionState } from "react";

import { SubmitButton } from "@/app/components/paper/Buttons";
import { fieldBox } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { acceptInvite, type FormState } from "@/app/lib/onboarding/actions";

export function AcceptForm({ token, name }: { token: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvite, {});
  const error = state.errors?.fullName;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert>{state.message}</FormAlert>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-[19px] font-semibold">
          Το όνομά σας
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={state.values?.fullName ?? name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "fullName-error" : undefined}
          className={fieldBox(error)}
        />
        {error && (
          <p id="fullName-error" className="font-semibold text-error">
            Πρόβλημα: {error}
          </p>
        )}
      </div>
      <SubmitButton pending="Αποδοχή…">Αποδοχή πρόσκλησης</SubmitButton>
    </form>
  );
}
