"use client";
// The form that asks for an email and sends a sign-in link. On the cover it also asks for the
// name (a new account); on the login sheet just the email.
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { sendLink, type FormState } from "@/app/lib/onboarding/actions";

export function LinkForm({ mode, next }: { mode: "register" | "login"; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(sendLink, {});
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="mode" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormAlert>{state.message}</FormAlert>
      {mode === "register" && (
        <LineField
          id="fullName"
          name="fullName"
          label="Ονοματεπώνυμο"
          autoComplete="name"
          defaultValue={v.fullName}
          error={state.errors?.fullName}
          required
        />
      )}
      <LineField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        spellCheck={false}
        defaultValue={v.email}
        error={state.errors?.email}
        hint={mode === "register" ? "Σας στέλνουμε σύνδεσμο για να μπείτε. Δεν χρειάζεται κωδικός." : undefined}
        required
      />
      <Actions>
        <SubmitButton pending="Αποστολή…">
          {mode === "register" ? "Στείλτε μου τον σύνδεσμο" : "Σύνδεσμος εισόδου"} <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
