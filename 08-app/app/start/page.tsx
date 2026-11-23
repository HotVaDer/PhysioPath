// For someone signed in who isn't in any clinic right now: taken out of a team, left their last clinic,
// or signed up and stopped before the clinic step. Before, they were thrown straight into «Η κλινική σας»
// (registering a new clinic). Now: a welcome, the invites waiting for them («Δείτε την πρόσκληση»), and
// registering a clinic of their own only if they want to.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaperLink } from "@/app/components/paper/Buttons";
import { Card } from "@/app/components/paper/Card";
import { InviteNotice } from "@/app/components/paper/InviteNotice";
import { SignOut } from "@/app/components/paper/SignOut";
import { currentUser, loadMyInvites, loadProfile } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Καλώς ήρθατε" };

export default async function StartPage() {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/welcome");
  if (user.is_anonymous) redirect("/try"); // a visitor without a demo clinic yet: the demo, not a sign-up
  const profile = await loadProfile(supabase, user.id);
  if (profile?.onboarded_at && profile.clinic_id) redirect("/"); // in a clinic: nothing to do here
  const invites = await loadMyInvites(supabase);
  const metaName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const name = (profile?.full_name ?? metaName)?.trim();

  return (
    <Card label="PhysioPath">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">Καλώς ήρθατε{name ? `, ${name}` : ""}</h1>
        <p>Αυτή τη στιγμή δεν είστε σε κάποια κλινική.</p>
      </div>

      {invites.length > 0 ? (
        <InviteNotice invites={invites} lead="Σας περιμένει πρόσκληση:" />
      ) : (
        <p className="text-muted">
          Αν σας καλέσει μια κλινική, η πρόσκληση θα έρθει στο email σας{user.email ? ` (${user.email})` : ""} και θα
          εμφανιστεί και εδώ.
        </p>
      )}

      <div className="flex flex-col gap-1.5 border-t border-hairline pt-4">
        <p className="font-semibold">Έχετε δική σας κλινική;</p>
        <p className="text-muted">Γράψτε την κλινική σας και ξεκινήστε. Θα είστε η/ο υπεύθυνη/ος της.</p>
        <PaperLink href="/register/clinic" variant="outline">
          Εγγραφή της κλινικής μου <span aria-hidden="true">→</span>
        </PaperLink>
      </div>

      <SignOut lead="Άλλος λογαριασμός;" className="mt-2" />
    </Card>
  );
}
