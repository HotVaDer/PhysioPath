// §4 of the registration form: read the whole form once, change what's wrong, sign and file.
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { ROLES, progress } from "@/app/lib/onboarding/schema";
import { requireFormUser } from "@/app/lib/onboarding/session";
import { SignForm } from "@/app/register/sign/SignForm";

export const metadata: Metadata = { title: "§4 Έλεγχος και υπογραφή" };

function Row({ label, href, change, children }: { label: string; href: Route; change: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-ledger py-3">
      <dt className="text-base text-muted sm:flex-[0_0_180px]">{label}</dt>
      <dd className="flex-[1_1_260px] font-typed text-[19px]">{children}</dd>
      <dd>
        <Link href={href} className="text-base">
          Αλλαγή<span className="sr-only"> {change}</span>
        </Link>
      </dd>
    </div>
  );
}

export default async function SignPage() {
  const { draft } = await requireFormUser();
  const done = progress(draft);
  if (!done.clinic) redirect("/register/clinic");
  if (!done.rooms) redirect("/register/rooms");
  if (!done.team) redirect("/register/team");

  const team = draft.team ?? [];
  const today = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Nicosia" }).format(new Date());

  return (
    <Sheet tabs={<BinderTabs current="sign" done={{ you: true, clinic: true, rooms: true, team: true }} />} page={{ n: 5, of: 5 }}>
      <div className="flex flex-col gap-5">
        <Link href="/register/team" className="self-start text-base">
          Πίσω
        </Link>
        <SectionHeading mark="§4" title="Έλεγχος και υπογραφή" note="Διαβάστε το δελτίο μία φορά. Αν κάτι λείπει, πατήστε «Αλλαγή»." />

        <dl className="flex flex-col border-b border-ledger">
          <Row label="Κλινική" href="/register/clinic" change="κλινικής">
            {draft.clinicName}, {draft.city}
          </Row>
          <Row label="Τηλέφωνο" href="/register/clinic" change="τηλεφώνου">
            {draft.phone}
          </Row>
          <Row label="Υπεύθυνη/ος" href="/register/clinic" change="υπευθύνου">
            {draft.ownerName}
          </Row>
          <Row label="Χώροι" href="/register/rooms" change="χώρων">
            {(draft.rooms ?? []).map((r, i) => (
              <span key={i} className="block">
                {r.name} · {[r.beds && `${r.beds} ${r.beds === 1 ? "κρεβάτι" : "κρεβάτια"}`, r.stations && `${r.stations} ${r.stations === 1 ? "θέση" : "θέσεις"}`]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ))}
          </Row>
          <Row label="Ομάδα" href="/register/team" change="ομάδας">
            {team.length === 0
              ? "Κανείς ακόμα"
              : team.map((m) => (
                  <span key={m.email} className="block break-all">
                    {m.email} · {ROLES[m.role]}
                  </span>
                ))}
          </Row>
        </dl>

        <SignForm ownerName={draft.ownerName ?? ""} date={today} />
      </div>
    </Sheet>
  );
}
