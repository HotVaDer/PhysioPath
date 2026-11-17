// The invite, as the invited person sees it: «Πρόσκληση από {κλινική}», who invites them, what
// they'll do there (one sentence), their name, and «Αποδοχή». The same plain card as signing in
// (no yellow carbon copy, no «ΑΝΤΙΓΡΑΦΟ»: review 2026-11-16).
// They arrive from the invite email, already signed in by its button; otherwise they sign in with
// a code first and come back here.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Card } from "@/app/components/paper/Card";
import { SignOut } from "@/app/components/paper/SignOut";
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

// What the person will do, in one sentence (the same words as the role cards on the owner's team page).
const ROLE_TEXT = {
  physio: { as: "φυσιοθεραπευτή", text: "Θα ηχογραφείτε σημειώσεις και θα εγκρίνετε τα προγράμματα των ασθενών σας." },
  assistant: { as: "βοηθό", text: "Θα βλέπετε την αίθουσα και θα απαντάτε όταν σας καλεί ασθενής. Δεν θα βλέπετε κλινικές σημειώσεις." },
} as const;

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
    // What happened, and what to do next, in plain words.
    const text: Record<string, string> = {
      used: "Αυτή η πρόσκληση έχει ήδη χρησιμοποιηθεί. Αν είστε ήδη στην ομάδα, πατήστε «Αρχική».",
      expired: "Αυτή η πρόσκληση έληξε (ισχύει 7 μέρες). Ζητήστε από την κλινική να σας τη στείλει ξανά.",
      other_email: `Η πρόσκληση στάλθηκε σε άλλο email. Τώρα έχετε μπει ως ${user.email}. Βγείτε και μπείτε με το email στο οποίο ήρθε η πρόσκληση.`,
      not_found: "Δεν βρήκαμε αυτή την πρόσκληση. Ανοίξτε την ξανά από το κουμπί μέσα στο email.",
    };
    return (
      <Card label="Πρόσκληση">
        <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">Η πρόσκληση δεν ισχύει</h1>
        <p role="alert">{text[details.status]}</p>
        {details.status === "used" ? (
          <Link href="/" className="min-h-11 content-center self-start">
            Αρχική <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <SignOut lead={details.status === "other_email" ? "Άλλος λογαριασμός;" : undefined} />
        )}
      </Card>
    );
  }

  const role = ROLE_TEXT[details.role ?? "assistant"];
  return (
    <Card label="Πρόσκληση">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">Πρόσκληση από {details.clinicName}</h1>
        <p>
          {details.invitedBy ? `Η/Ο ${details.invitedBy} σας καλεί` : "Σας καλούν"} στην ομάδα της κλινικής
          {details.clinicCity ? ` (${details.clinicCity})` : ""}, ως <span className="font-semibold">{role.as}</span>.
        </p>
        <p className="text-muted">{role.text}</p>
      </div>
      <AcceptForm token={token} name={typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""} />
      <p className="text-base text-muted">
        Μπαίνετε με το email <span className="break-all font-semibold text-ink">{details.email}</span>.
      </p>
    </Card>
  );
}
