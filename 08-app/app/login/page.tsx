// Sign in again with an email link (no passwords): a small sign-in card, not the registration form.
// Also where a used, expired or other-browser link lands.
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

  return (
    <Card
      label="ΣΥΝΔΕΣΗ"
      footer={
        <>
          Νέα κλινική; <Link href="/register">Εγγραφή κλινικής</Link>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-[1.1] sm:text-[36px]">Καλώς ήρθατε ξανά</h1>
        <p className="italic text-muted">Γράψτε το email σας. Σας στέλνουμε σύνδεσμο εισόδου, χωρίς κωδικό.</p>
      </div>
      {link === "expired" && <FormAlert>Ο σύνδεσμος έχει ήδη χρησιμοποιηθεί ή έληξε. Ζητήστε έναν καινούργιο εδώ.</FormAlert>}
      {link === "other-browser" && (
        <FormAlert>
          Ο σύνδεσμος άνοιξε σε άλλο πρόγραμμα περιήγησης ή συσκευή από αυτή που τον ζητήσατε. Ζητήστε έναν καινούργιο εδώ.
        </FormAlert>
      )}
      <LinkForm mode="login" next={target} />
    </Card>
  );
}
