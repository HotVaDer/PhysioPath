// After asking for a sign-in link: the same small card, so it's clear this is signing in, not registering.
import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/app/components/paper/Card";

export const metadata: Metadata = { title: "Ελέγξτε το email σας" };

export default async function LoginCheckEmailPage({ searchParams }: PageProps<"/login/check-email">) {
  const { email } = await searchParams;
  const address = typeof email === "string" && email.length <= 254 ? email : null;

  return (
    <Card
      label="ΣΥΝΔΕΣΗ"
      footer={
        <>
          Δεν ήρθε σε 2–3 λεπτά; Κοιτάξτε στα ανεπιθύμητα ή <Link href="/login">ζητήστε νέο σύνδεσμο</Link>.
        </>
      }
    >
      <h1 className="font-display text-[32px] leading-[1.1] sm:text-[36px]">Ελέγξτε το email σας</h1>
      {address ? (
        <p>
          Στείλαμε σύνδεσμο εισόδου στο <span className="break-all font-typed font-bold">{address}</span>.
        </p>
      ) : (
        <p>Στείλαμε σύνδεσμο εισόδου στο email σας.</p>
      )}
      <p className="text-muted">Πατήστε τον και μπαίνετε. Λειτουργεί μία φορά και λήγει σε 1 ώρα.</p>
    </Card>
  );
}
