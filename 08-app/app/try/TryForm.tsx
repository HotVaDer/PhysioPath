"use client";
// The one button on /try. The language and the r= code of the link travel as hidden fields.
import { useActionState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { Captcha } from "@/app/components/paper/Captcha";
import { FormAlert } from "@/app/components/paper/Notes";
import { startDemo, type DemoFormState } from "@/app/lib/demo/actions";
import { demoText, type DemoLang } from "@/app/lib/demo/text";

export function TryForm({ lang, refCode }: { lang: DemoLang; refCode?: string }) {
  const [state, action] = useActionState<DemoFormState, FormData>(startDemo, {});
  const t = demoText(lang);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      {refCode && <input type="hidden" name="ref" value={refCode} />}
      <FormAlert>{state.message}</FormAlert>
      <Captcha resetKey={state} lang={lang} />
      <Actions>
        <SubmitButton pending={t.starting}>
          {t.start} <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
