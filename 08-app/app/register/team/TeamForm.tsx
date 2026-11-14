"use client";
// §3 Ομάδα: the table of people to invite, with ☒ in the role they'll have, and the yellow
// "Νέα γραμμή" slip to add someone. Nothing is sent yet: the invites go out when the form is filed.
import { useActionState, useState, type KeyboardEvent } from "react";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { saveTeam, type FormState } from "@/app/lib/onboarding/actions";
import { ROLES, type Role } from "@/app/lib/onboarding/schema";

type Member = { email: string; role: Role };

function Box({ on }: { on: boolean }) {
  return (
    <td className={`text-center font-typed text-[22px] ${on ? "font-bold" : "text-muted"}`}>
      <span aria-hidden="true">{on ? "☒" : "☐"}</span>
      <span className="sr-only">{on ? "Ναι" : "Όχι"}</span>
    </td>
  );
}

export function TeamForm({ initial, ownerName, ownEmail }: { initial: Member[]; ownerName: string; ownEmail: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveTeam, {});
  const [team, setTeam] = useState<Member[]>(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("assistant");
  const [problem, setProblem] = useState<string | null>(null);

  function add() {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return setProblem("Αυτό δεν μοιάζει με email. Παράδειγμα: eleni@example.com");
    if (clean === ownEmail) return setProblem("Αυτό είναι το δικό σας email. Είστε ήδη στην κλινική.");
    if (team.some((m) => m.email === clean)) return setProblem("Αυτό το email υπάρχει ήδη στον πίνακα.");
    if (team.length >= 30) return setProblem("Το πολύ 30 άτομα. Τους υπόλοιπους τους καλείτε από τις Ρυθμίσεις.");
    setTeam((t) => [...t, { email: clean, role }]);
    setEmail("");
    setProblem(null);
  }

  // Enter in the email field adds the person instead of sending the whole sheet.
  function onEnter(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      add();
    }
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="team" value={JSON.stringify(team)} />
      <FormAlert>{state.message}</FormAlert>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[17px]">
          <caption className="sr-only">Η ομάδα της κλινικής</caption>
          <thead>
            <tr className="border-b-2 border-ink text-[15px]">
              <th scope="col" className="px-1.5 py-2 text-left font-semibold">Όνομα · email</th>
              <th scope="col" className="w-[120px] px-1.5 py-2 text-center font-semibold">Φυσιοθερ.<sup>*</sup></th>
              <th scope="col" className="w-[100px] px-1.5 py-2 text-center font-semibold">Βοηθός<sup>**</sup></th>
              <th scope="col" className="w-[100px] px-1.5 py-2"><span className="sr-only">Ενέργεια</span></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ledger">
              <td className="px-1.5 py-3">
                <span className="font-typed">{ownerName}</span> <span className="text-[15px] text-muted">(εσείς)</span>
              </td>
              <Box on />
              <Box on={false} />
              <td />
            </tr>
            {team.map((m) => (
              <tr key={m.email} className="border-b border-ledger">
                <td className="break-all px-1.5 py-3 font-typed">{m.email}</td>
                <Box on={m.role === "physio"} />
                <Box on={m.role === "assistant"} />
                <td className="text-right">
                  <button
                    type="button"
                    className="min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink"
                    onClick={() => setTeam((t) => t.filter((x) => x.email !== m.email))}
                  >
                    Αφαίρεση<span className="sr-only"> {m.email}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <fieldset className="flex flex-col gap-3.5 bg-tab-yellow px-5 py-4">
        <legend className="float-left mb-1 w-full text-lg font-bold">Νέα γραμμή</legend>
        <div className="flex flex-wrap items-end gap-x-4.5 gap-y-3">
          <div className="flex flex-[1_1_240px] flex-col gap-0.5">
            <label htmlFor="new-email" className="text-[15px]">Email</label>
            <input
              id="new-email"
              type="email"
              autoComplete="off"
              spellCheck={false}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              onKeyDown={onEnter}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? "new-email-error" : undefined}
              className="min-h-11 border-0 border-b-2 border-ink bg-transparent px-1 font-typed text-[19px] text-ink"
            />
          </div>
          <div className="flex flex-[0_1_200px] flex-col gap-0.5">
            <label htmlFor="new-role" className="text-[15px]">Ρόλος</label>
            <select
              id="new-role"
              value={role}
              onChange={(ev) => setRole(ev.target.value as Role)}
              className="min-h-11 rounded-none border-0 border-b-2 border-ink bg-transparent px-1 font-typed text-[19px] text-ink"
            >
              <option value="assistant">{ROLES.assistant}</option>
              <option value="physio">{ROLES.physio}</option>
            </select>
          </div>
          <button type="button" onClick={add} className="min-h-12 cursor-pointer border-2 border-ink px-4.5 font-bold text-ink hover:bg-sheet">
            Προσθήκη
          </button>
        </div>
        {problem && (
          <p id="new-email-error" role="alert" className="font-semibold text-ink">
            {problem}
          </p>
        )}
      </fieldset>

      <div className="flex max-w-[62ch] flex-col gap-1 border-t border-ink pt-2.5 text-[15px] text-muted">
        <p>
          <sup>*</sup> Ο φυσιοθεραπευτής ηχογραφεί, βλέπει και εγκρίνει την κλινική σημείωση και το πρόγραμμα. Τίποτα δεν
          φτάνει στον ασθενή πριν την έγκρισή του.
        </p>
        <p>
          <sup>**</sup> Ο βοηθός βλέπει την αίθουσα, απαντά στις κλήσεις και δίνει στον ασθενή την οθόνη του. Δεν βλέπει
          κλινικές σημειώσεις.
        </p>
      </div>

      <Actions>
        <SubmitButton pending="Αποθήκευση…">
          Συνέχεια στο §4 <span aria-hidden="true">→</span>
        </SubmitButton>
        {team.length === 0 && <span className="text-muted">Χωρίς ομάδα για τώρα; Πατήστε «Συνέχεια». Τους καλείτε και αργότερα.</span>}
      </Actions>
    </form>
  );
}
