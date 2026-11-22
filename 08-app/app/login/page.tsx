// Sign in again with a 6-digit email code (no passwords): a small sign-in card, not sign-up.
// Also where a used, expired or other-browser link lands, and where an invited person comes when
// they open their invite without being signed in (then it speaks about the invite, not "welcome back").
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/app/components/paper/Card";
import { FormAlert } from "@/app/components/paper/Notes";
import { currentUser } from "@/app/lib/onboarding/session";
import { safeNext } from "@/app/lib/site";
import { LinkForm } from "@/app/register/LinkForm";

export const metadata: Metadata = { title: "Σύνδεση" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { link, next } = await searchParams;
  const { user } = await currentUser();
  const target = safeNext(typeof next === "string" ? next : null);
  if (user) redirect(target as Route); // safeNext only lets our own paths through
  const invite = target.startsWith("/invite/");

  return (
    <Card
      label={invite ? "Πρόσκληση" : "Είσοδος"}
      footer={
        invite ? undefined : (
          <>
            Νέα κλινική; <Link href="/register">Εγγραφή κλινικής</Link>
          </>
        )
      }
    >
      {!invite && (
        <Link href="/welcome" className="self-start">
          <span aria-hidden="true">←</span> Πίσω
        </Link>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">
          {invite ? "Δείτε την πρόσκλησή σας" : "Καλώς ήρθατε ξανά"}
        </h1>
        <p className="text-muted">
          {invite ? "Γράψτε το email στο οποίο ήρθε η πρόσκληση. " : "Γράψτε το email σας. "}
          Σας στέλνουμε έναν κωδικό 6 ψηφίων. Δεν χρειάζεται συνθηματικό.
        </p>
      </div>
      {link === "expired" &&
        (invite ? (
          <FormAlert>
            Το κουμπί στο email έληξε (ισχύει 1 ώρα), αλλά η πρόσκληση ισχύει ακόμα. Γράψτε το email σας για να πάρετε
            κωδικό: μετά βλέπετε την πρόσκληση.
          </FormAlert>
        ) : (
          <FormAlert>Το κουμπί στο email έχει ήδη χρησιμοποιηθεί ή έληξε. Ζητήστε νέο κωδικό εδώ.</FormAlert>
        ))}
      {link === "other-browser" && (
        <FormAlert>
          Το κουμπί στο email άνοιξε σε άλλο πρόγραμμα ή συσκευή. Ζητήστε νέο κωδικό εδώ και γράψτε τον σε αυτή τη σελίδα.
        </FormAlert>
      )}
      <LinkForm mode="login" next={target} />
    </Card>
  );
}
