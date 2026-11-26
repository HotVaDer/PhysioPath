"use client";
// The one button on /try: a normal form post to POST /try/start (app/try/start/route.ts), so the new login
// comes back with a full page load, which the browsers built into WhatsApp, Viber and Messenger keep.
// The language and the r= code of the link travel as hidden fields. A problem comes back as ?e=… on /try and
// arrives here as `message`; the page loads again, so the security check starts fresh by itself.
import { useEffect, useState } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { Captcha } from "@/app/components/paper/Captcha";
import { FormAlert } from "@/app/components/paper/Notes";
import { demoText, type DemoLang } from "@/app/lib/demo/text";

export function TryForm({ lang, refCode, message }: { lang: DemoLang; refCode?: string; message?: string }) {
  const [sending, setSending] = useState(false);
  const t = demoText(lang);
  // Back to this page from the board (the browser's back button keeps the page as it was): the button
  // must work again, not stay on «Ετοιμάζουμε…».
  useEffect(() => {
    const again = () => setSending(false);
    window.addEventListener("pageshow", again);
    return () => window.removeEventListener("pageshow", again);
  }, []);
  return (
    <form method="post" action="/try/start" onSubmit={() => setSending(true)} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      {refCode && <input type="hidden" name="ref" value={refCode} />}
      <FormAlert>{message}</FormAlert>
      <Captcha lang={lang} />
      <Actions>
        <SubmitButton pending={t.starting} busy={sending}>
          {t.start} <span aria-hidden="true">→</span>
        </SubmitButton>
      </Actions>
    </form>
  );
}
