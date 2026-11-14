// After "Στείλτε μου τον σύνδεσμο": tell them where the link went and what to do if it didn't arrive.
import type { Metadata } from "next";
import Link from "next/link";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { Sheet } from "@/app/components/paper/Sheet";

export const metadata: Metadata = { title: "Ελέγξτε το email σας" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/register/check-email">) {
  const { email } = await searchParams;
  const address = typeof email === "string" && email.length <= 254 ? email : null;

  return (
    <Sheet tabs={<BinderTabs current="you" done={{}} />}>
      <div className="flex max-w-[560px] flex-col gap-5">
        <h1 className="font-display text-[34px] leading-[1.1] sm:text-[40px]">Ελέγξτε το email σας</h1>
        {address ? (
          <>
            <p>Στείλαμε έναν σύνδεσμο στο</p>
            <p className="-mt-2.5 self-start break-all border-b-2 border-line pb-1.5 font-typed text-[22px] font-bold">{address}</p>
          </>
        ) : (
          <p>Στείλαμε έναν σύνδεσμο στο email σας.</p>
        )}
        <p>Ανοίξτε τον και συνεχίζετε στο §1. Μπορείτε να τον ανοίξετε και σε άλλη συσκευή. Λήγει σε 1 ώρα.</p>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-hairline pt-3.5">
          <h2 className="text-lg font-bold">Δεν ήρθε;</h2>
          <p className="text-muted">
            Κοιτάξτε στα ανεπιθύμητα. Ή <Link href="/register">ξεκινήστε ξανά</Link> και ελέγξτε το email.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
