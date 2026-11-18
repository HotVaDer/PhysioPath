"use client";
// Type the 6-digit code from the email, on the same page, without leaving the browser.
// Shared by sign-up (step 2) and sign-in. Also: which email to look for, what to do if it didn't
// come («Στείλτε μου νέο κωδικό»), and a way back to fix a mistyped email.
// Fits one screen: on a laptop the "didn't come" help sits in a column beside the code; on a phone
// it folds into «Δεν ήρθε το email;», so the code box and the button stay in view.
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { resendCode, verifyCode, type FormState } from "@/app/lib/onboarding/actions";
import { EMAIL_SUBJECTS } from "@/app/lib/site";

type Props = { mode: "register" | "login"; email: string; next?: string };

function Hidden({ mode, email, next }: Props) {
  return (
    <>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="email" value={email} />
      {next && <input type="hidden" name="next" value={next} />}
    </>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 cursor-pointer self-start border-2 border-action bg-white px-4.5 font-bold text-action hover:bg-note-green disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? "Αποστολή…" : "Στείλτε μου νέο κωδικό"}
    </button>
  );
}

// "Didn't come?": wait a bit, look in spam, ask for a new code, or fix the email.
function NoEmailHelp(props: Props) {
  const [resent, resend] = useActionState<FormState, FormData>(resendCode, {});
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">Μπορεί να αργήσει 1–2 λεπτά. Κοιτάξτε και στα «Ανεπιθύμητα» (spam).</p>
      <form action={resend} className="flex flex-col gap-3">
        <Hidden {...props} />
        <FormAlert>{resent.message}</FormAlert>
        {resent.notice && (
          <p role="status" className="bg-note-green px-4 py-3 font-semibold">
            {resent.notice}
          </p>
        )}
        <ResendButton />
      </form>
      <p>
        Λάθος email; <Link href={props.mode === "register" ? "/register" : "/login"}>Αλλάξτε το</Link>
      </p>
    </div>
  );
}

export function CodeForm(props: Props) {
  const { mode, email } = props;
  const [state, verify] = useActionState<FormState, FormData>(verifyCode, {});

  return (
    <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-4">
        <p>
          Στείλαμε κωδικό 6 ψηφίων στο <span className="break-words font-semibold">{email}</span>.{" "}
          <span className="text-muted">
            Ψάξτε για email από PhysioPath με θέμα «{EMAIL_SUBJECTS[mode]}».
          </span>
        </p>

        <form action={verify} noValidate className="flex flex-col gap-4">
          <Hidden {...props} />
          <FormAlert>{state.message}</FormAlert>
          <LineField
            id="code"
            name="code"
            label="Ο κωδικός από το email"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            width="max-w-[260px]"
            className="font-typed text-[30px] font-bold tracking-[0.25em]"
            defaultValue={state.values?.code}
            error={state.errors?.code}
            autoFocus
          />
          <Actions>
            <SubmitButton pending="Έλεγχος…">
              {mode === "register" ? "Συνέχεια" : "Είσοδος"} <span aria-hidden="true">→</span>
            </SubmitButton>
          </Actions>
          <p className="text-muted">Ή πατήστε το πράσινο κουμπί μέσα στο email: κάνει το ίδιο.</p>
        </form>
      </div>

      {/* Laptop: beside the code. */}
      <aside aria-label="Δεν ήρθε το email;" className="hidden flex-col gap-2 self-start border-l-2 border-hairline pl-6 lg:flex">
        <h2 className="font-display text-[22px]">Δεν ήρθε το email;</h2>
        <NoEmailHelp {...props} />
      </aside>

      {/* Phone and tablet: folded under the button, opened with a tap. */}
      <details className="border-t border-hairline pt-1 lg:hidden">
        <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-action underline underline-offset-[3px]">
          Δεν ήρθε το email;
        </summary>
        <div className="pb-1 pt-2">
          <NoEmailHelp {...props} />
        </div>
      </details>
    </div>
  );
}
