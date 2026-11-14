// Page 1: the cover of the registration form and "Τα στοιχεία σας" (name and email).
// Someone already signed in skips it: on to §1, or home if their clinic is already set up.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { Sheet } from "@/app/components/paper/Sheet";
import { currentUser, loadProfile } from "@/app/lib/onboarding/session";
import { LinkForm } from "@/app/register/LinkForm";

export const metadata: Metadata = { title: "Εγγραφή κλινικής" };

export default async function CoverPage() {
  const { supabase, user } = await currentUser();
  if (user) {
    const profile = await loadProfile(supabase, user.id);
    redirect(profile?.onboarded_at ? "/" : "/register/clinic");
  }

  return (
    <Sheet
      tabs={<BinderTabs current="you" done={{}} />}
      cover={{
        subtitle:
          "Τέσσερις σύντομες ενότητες. Θα χρειαστείτε το τηλέφωνο της κλινικής, πόσα κρεβάτια έχετε και τα email της ομάδας σας.",
      }}
      headerAside={
        <span className="text-muted">
          Έχετε λογαριασμό; <Link href="/login">Σύνδεση</Link>
        </span>
      }
      page={{ n: 1, of: 5 }}
    >
      <h2 className="mb-6 font-display text-[32px] leading-[1.1]">Τα στοιχεία σας</h2>
      <LinkForm mode="register" />
    </Sheet>
  );
}
