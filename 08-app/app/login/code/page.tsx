// Sign-in: type the 6-digit code from the email, on the same small card as the sign-in page.
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { Card } from "@/app/components/paper/Card";
import { currentUser } from "@/app/lib/onboarding/session";
import { safeNext } from "@/app/lib/site";
import { CodeForm } from "@/app/register/code/CodeForm";

export const metadata: Metadata = { title: "Ο κωδικός από το email" };

export default async function LoginCodePage({ searchParams }: PageProps<"/login/code">) {
  const { email, next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  const { user } = await currentUser();
  if (user) redirect(target as Route); // safeNext only lets our own paths through
  if (typeof email !== "string" || !email.includes("@") || email.length > 254) redirect("/login");

  return (
    <Card label="Είσοδος" wide>
      <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">Ελέγξτε το email σας</h1>
      <CodeForm mode="login" email={email} next={target === "/" ? undefined : target} />
    </Card>
  );
}
