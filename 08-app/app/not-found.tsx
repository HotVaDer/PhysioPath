// «Δεν βρέθηκε»: a link that doesn't exist, a program or session that isn't there, or an old or
// mistyped QR code on a patient's phone. The same small card on the desk (with the «Φ» marks) as
// signing in, instead of Next's plain white page. Next adds noindex by itself.
import type { Metadata } from "next";

import { PaperLink } from "@/app/components/paper/Buttons";
import { Card } from "@/app/components/paper/Card";

export const metadata: Metadata = { title: "Δεν βρέθηκε" };

export default function NotFound() {
  return (
    <Card>
      <h1 className="font-display text-[30px] leading-tight sm:text-[34px]">Δεν βρέθηκε αυτή η σελίδα</h1>
      <p>Ίσως ο σύνδεσμος είναι παλιός ή γράφτηκε λάθος.</p>
      <p className="text-muted">Αν σκανάρατε κωδικό QR, ζητήστε από τον φυσιοθεραπευτή να σας τον δείξει ξανά.</p>
      <PaperLink href="/">Στην αρχή</PaperLink>
    </Card>
  );
}
