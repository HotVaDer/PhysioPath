// «Η κλινική Χ σας προσκάλεσε»: invites waiting for the signed-in person (loadMyInvites), shown on the
// home page, on «Οι κλινικές σας» and before someone creates a clinic of their own. So an invite is
// never missed, even when its email was lost, ignored or its button expired.
import type { Route } from "next";
import Link from "next/link";

import type { MyInvite } from "@/app/lib/onboarding/session";

const AS: Record<MyInvite["role"], string> = { physio: "φυσιοθεραπευτή", assistant: "βοηθό" };

export function InviteNotice({ invites, lead }: { invites: MyInvite[]; lead?: string }) {
  if (invites.length === 0) return null;
  return (
    <section aria-label="Προσκλήσεις" className="flex flex-col gap-2 border-2 border-action bg-note-green px-4 py-3">
      {lead && <p className="font-semibold">{lead}</p>}
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <li key={invite.token} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong>{invite.clinicName}</strong>
              {invite.clinicCity ? ` (${invite.clinicCity})` : ""} σας προσκάλεσε, ως {AS[invite.role]}
              {invite.invitedBy ? ` · από ${invite.invitedBy}` : ""}.
            </span>
            <Link href={`/invite/${invite.token}` as Route} className="min-h-11 content-center font-bold">
              Δείτε την πρόσκληση<span className="sr-only"> από {invite.clinicName}</span> <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
