"use client";
// A button that asks first, for things that can't be undone with one click («Αφαίρεση», «Αποχώρηση»):
// press → «… ; Ναι / Όχι», and only «Ναι» sends the form it sits in.
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

const quiet = "min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink";

function Yes({ pending }: { pending: string }) {
  const { pending: sending } = useFormStatus();
  return (
    <button type="submit" disabled={sending} className="min-h-11 cursor-pointer bg-error px-3 font-bold text-white disabled:cursor-wait disabled:opacity-70">
      {sending ? pending : "Ναι"}
    </button>
  );
}

export function ConfirmSubmit({ children, question, pending }: { children: ReactNode; question: string; pending: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={quiet}>
        {children}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2.5">
      <span className="font-semibold">{question}</span>
      <Yes pending={pending} />
      <button type="button" onClick={() => setAsking(false)} className="min-h-11 cursor-pointer border-2 border-line bg-white px-3 font-bold">
        Όχι
      </button>
    </span>
  );
}
