// Where the button in our emails lands (through app/auth/confirm): one «Συνέχεια» button, and only that
// press signs in (followEmailLink). Work email systems open every link to check it, and before this page
// that used up the one-time link before the person clicked; they don't press buttons.
// If someone else is signed in on this browser, it says so: the press signs in as the email's account.
// noindex + no-referrer: the link in the address is a key to an account.
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { Actions, SubmitButton } from "@/app/components/paper/Buttons";
import { Card } from "@/app/components/paper/Card";
import { followEmailLink } from "@/app/lib/onboarding/actions";
import { currentUser } from "@/app/lib/onboarding/session";
import { isEmailLinkType, loginAfterLink, safeNext } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Συνέχεια",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ContinuePage({ searchParams }: PageProps<"/auth/continue">) {
  const query = await searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : null);
  const tokenHash = typeof query.token_hash === "string" ? query.token_hash : "";
  const type = query.type;
  if (!tokenHash || !isEmailLinkType(type)) redirect(loginAfterLink("expired", next) as Route);

  const invite = next.startsWith("/invite/");
  const { user } = await currentUser();

  return (
    <Card label={invite ? "Πρόσκληση" : "Είσοδος"}>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">
          {invite ? "Δείτε την πρόσκλησή σας" : "Είσοδος στο PhysioPath"}
        </h1>
        <p className="text-muted">Πατήστε «Συνέχεια» για να μπείτε.</p>
      </div>
      {user && (
        <p className="bg-tab-yellow px-4 py-3">
          Τώρα είστε μέσα ως <span className="break-all font-semibold">{user.email}</span>. Με «Συνέχεια» μπαίνετε με τον
          λογαριασμό στον οποίο ήρθε το email.
        </p>
      )}
      <form action={followEmailLink}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <Actions>
          <SubmitButton pending="Είσοδος…">
            Συνέχεια <span aria-hidden="true">→</span>
          </SubmitButton>
        </Actions>
      </form>
    </Card>
  );
}
