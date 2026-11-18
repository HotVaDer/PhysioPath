"use client";
// «Αποδοχή»: the invited person writes their name (how the team will see them) and joins the clinic.
// Someone already in another clinic keeps the name they have (it's theirs in every clinic): no field,
// just a line saying so (member = their current clinic and name).
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { acceptInvite, type FormState } from "@/app/lib/onboarding/actions";

type Props = { token: string; name: string; member?: { name: string; clinic: string } };

export function AcceptForm({ token, name, member }: Props) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvite, {});
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert>{state.message}</FormAlert>
      {member ? (
        <>
          <input type="hidden" name="fullName" value={member.name} />
          <p>
            Θα μπείτε με το όνομα <span className="font-semibold">{member.name}</span>. Η κλινική «{member.clinic}» μένει
            όπως είναι: αλλάζετε κλινική με το «Αλλαγή», δίπλα στο όνομα της κλινικής.
          </p>
        </>
      ) : (
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
      )}
      <Actions>
        <SubmitButton pending="Αποδοχή…">
          Αποδοχή <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
