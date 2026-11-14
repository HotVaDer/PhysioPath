"use client";
// «Αποδοχή πρόσκλησης»: the invitee types their name and joins the clinic.
import { useActionState } from "react";

import { SubmitButton } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { acceptInvite, type FormState } from "@/app/lib/onboarding/actions";

export function AcceptForm({ token, name }: { token: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvite, {});
  const error = state.errors?.fullName;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert>{state.message}</FormAlert>
      <div className="flex flex-col gap-0.5">
        <label htmlFor="fullName" className="text-[15px]">
          Το όνομά σας
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={state.values?.fullName ?? name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "fullName-error" : undefined}
          className="min-h-11 border-0 border-b-2 border-ink bg-transparent px-1 font-typed text-xl text-ink"
        />
        {error && (
          <p id="fullName-error" className="pt-1 font-semibold text-ink">
            {error}
          </p>
        )}
      </div>
      <SubmitButton pending="Αποδοχή…">Αποδοχή πρόσκλησης</SubmitButton>
    </form>
  );
}
