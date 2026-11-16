// Sign-up, step 1: name and email. Someone already signed in skips it: on to the clinic
// step, or home if their clinic is already set up.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { currentUser, loadProfile } from "@/app/lib/onboarding/session";
import { LinkForm } from "@/app/register/LinkForm";

export const metadata: Metadata = { title: "Εγγραφή κλινικής" };

export default async function RegisterPage() {
  const { supabase, user } = await currentUser();
  if (user) {
    const profile = await loadProfile(supabase, user.id);
    redirect(profile?.onboarded_at ? "/" : "/register/clinic");
  }

  return (
    <Sheet
      step={{ n: 1, of: 3 }}
      headerAside={
        <span className="text-muted">
          Έχετε λογαριασμό; <Link href="/login">Είσοδος</Link>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <Link href="/welcome" className="self-start">
          <span aria-hidden="true">←</span> Πίσω
        </Link>
        <SectionHeading title="Εγγραφή κλινικής" note="Ξεκινάμε με το όνομα και το email σας. Μετά, 2 ακόμα σύντομα βήματα." />
        <LinkForm mode="register" />
      </div>
    </Sheet>
  );
}
