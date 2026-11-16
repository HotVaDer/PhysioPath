// The invitee's copy of the form: a yellow carbon copy with a torn top edge (canvas board PFInvite).
// They arrive here from the invite email, already signed in by its link.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { Logo } from "@/app/components/paper/Logo";
import { SignOut } from "@/app/components/paper/SignOut";
import { ROLES, type Role } from "@/app/lib/onboarding/schema";
import { currentUser } from "@/app/lib/onboarding/session";
import { AcceptForm } from "@/app/invite/[token]/AcceptForm";

export const metadata: Metadata = { title: "Πρόσκληση" };

const Details = z.object({
  status: z.enum(["ok", "used", "expired", "other_email", "not_found"]),
  email: z.string().optional(),
  role: z.enum(["physio", "assistant"]).optional(),
  clinicName: z.string().optional(),
  clinicCity: z.string().nullable().optional(),
  invitedBy: z.string().nullable().optional(),
});

function CarbonCopy({ children }: { children: ReactNode }) {
  return (
    <div className="px-3.5 py-5 sm:py-12">
      <main
        id="main"
        className="relative mx-auto flex max-w-[460px] flex-col gap-4 bg-tab-yellow pb-6 pl-12 pr-6 pt-8 shadow-[0_14px_30px_-22px_rgba(43,36,32,0.6)]"
      >
        {/* Perforated top edge and red margin: decoration only. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2.5 bg-[radial-gradient(circle_at_6px_0,var(--color-desk)_4px,transparent_4.5px)] bg-[length:12px_10px]"
        />
        <span aria-hidden="true" className="absolute inset-y-0 left-7 w-[3px] border-x border-margin" />
        <header className="flex items-center justify-between gap-2 border-b-[3px] border-double border-ink pb-2.5">
          <Logo />
          <span className="font-typed text-base font-bold">ΑΝΤΙΓΡΑΦΟ</span>
        </header>
        {children}
      </main>
    </div>
  );
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { supabase, user } = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const valid = z.uuid().safeParse(token);
  let details: z.infer<typeof Details> = { status: "not_found" };
  if (valid.success) {
    const { data } = await supabase.rpc("invite_details", { invite_token: valid.data });
    details = Details.safeParse(data).data ?? details;
  }

  if (details.status !== "ok") {
    const text: Record<string, string> = {
      used: "Αυτή η πρόσκληση έχει ήδη χρησιμοποιηθεί.",
      expired: "Αυτή η πρόσκληση έληξε. Ζητήστε νέα από την κλινική.",
      other_email: `Αυτή η πρόσκληση είναι για άλλο email. Έχετε συνδεθεί ως ${user.email}.`,
      not_found: "Αυτή η πρόσκληση δεν υπάρχει. Ελέγξτε ότι ανοίξατε ολόκληρο τον σύνδεσμο από το email.",
    };
    return (
      <CarbonCopy>
        <h1 className="font-display text-[30px] leading-[1.1]">Η πρόσκληση δεν ισχύει</h1>
        <p role="alert">{text[details.status]}</p>
        <SignOut lead={details.status === "other_email" ? "Άλλος λογαριασμός;" : undefined} />
      </CarbonCopy>
    );
  }

  const role = ROLES[details.role as Role];
  return (
    <CarbonCopy>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] leading-[1.1]">Σας προσκαλούν ως {role === ROLES.physio ? "φυσιοθεραπευτή" : "βοηθό"}</h1>
        <p>
          {details.invitedBy ? (
            <>
              Η/Ο <span className="font-typed">{details.invitedBy}</span>, για{" "}
            </>
          ) : (
            "Για "
          )}
          <span className="font-typed">{details.clinicName}</span>
          {details.clinicCity ? `, ${details.clinicCity}` : ""}.
        </p>
        <p className="text-base">
          {details.role === "assistant"
            ? "Θα βλέπετε την αίθουσα και θα απαντάτε όταν σας καλεί ασθενής. Τις κλινικές σημειώσεις τις βλέπουν μόνο οι φυσιοθεραπευτές."
            : "Θα ηχογραφείτε τις σημειώσεις σας και θα εγκρίνετε τα προγράμματα των ασθενών σας."}
        </p>
      </div>
      <AcceptForm token={token} name={typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""} />
      <p className="pt-2 text-base">
        Μπαίνετε ως <span className="break-all font-typed">{details.email}</span>.
      </p>
    </CarbonCopy>
  );
}
