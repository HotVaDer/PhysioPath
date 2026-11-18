// Sign-up, step 2: type the 6-digit code from the email. Someone already signed in skips it.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { currentUser } from "@/app/lib/onboarding/session";
import { CodeForm } from "@/app/register/code/CodeForm";

export const metadata: Metadata = { title: "Ο κωδικός από το email" };

export default async function RegisterCodePage({ searchParams }: PageProps<"/register/code">) {
  const { email } = await searchParams;
  const { user } = await currentUser();
  if (user) redirect("/register/clinic"); // that page sends people with a clinic home
  if (typeof email !== "string" || !email.includes("@") || email.length > 254) redirect("/register");

  return (
    <Sheet step={{ n: 2, of: 3 }} wide>
      <div className="flex flex-col gap-3">
        <SectionHeading title="Ελέγξτε το email σας" />
        <CodeForm mode="register" email={email} />
      </div>
    </Sheet>
  );
}
