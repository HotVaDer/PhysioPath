// «Κλινική»: the open clinic's details (name, phone, rooms, team), with «Αλλαγή» / «Διαχείριση» for the
// owner. Moved here from the home page on 2026-11-18, when the room board took over «Η αίθουσα» (/).
// Every role sees it; only the owner gets the links to change things.
import type { Metadata } from "next";
import Link from "next/link";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { requireMember } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Κλινική" };

export default async function ClinicPage() {
  const { supabase, profile } = await requireMember();
  const isOwner = profile.role === "owner";
  const [{ data: clinic }, { data: rooms }, { count: invited }] = await Promise.all([
    supabase.from("clinics").select("name, city, phone").eq("id", profile.clinic_id).maybeSingle(),
    supabase.from("rooms").select("id, name, beds, stations").order("position"),
    isOwner ? supabase.from("invites").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 0 }),
  ]);

  return (
    <StaffSheet profile={profile} current="clinic">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-[36px] leading-[1.08] sm:text-[42px]">Κλινική</h1>

        <dl className="flex flex-col border-b border-hairline">
          <div className="flex flex-wrap gap-x-4 border-t border-hairline py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Κλινική</dt>
            <dd className="text-[19px]">
              {clinic?.name}
              {clinic?.city ? `, ${clinic.city}` : ""}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 border-t border-hairline py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Τηλέφωνο</dt>
            <dd className="text-[19px]">{clinic?.phone}</dd>
          </div>
          <div className="flex flex-wrap items-start gap-x-4 border-t border-hairline py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Χώροι</dt>
            <dd className="flex-1 text-[19px]">
              {(rooms ?? []).map((r) => (
                <span key={r.id} className="block">
                  {[
                    r.name,
                    r.beds > 0 && `${r.beds} ${r.beds === 1 ? "κρεβάτι" : "κρεβάτια"}`,
                    r.stations > 0 && `${r.stations} ${r.stations === 1 ? "θέση άσκησης" : "θέσεις άσκησης"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ))}
            </dd>
            {isOwner && (
              <dd>
                <Link href="/settings/rooms" className="min-h-11 content-center">
                  Αλλαγή<span className="sr-only"> χώρων</span>
                </Link>
              </dd>
            )}
          </div>
          {isOwner && (
            <div className="flex flex-wrap items-start gap-x-4 border-t border-hairline py-3">
              <dt className="text-base text-muted sm:flex-[0_0_180px]">Ομάδα</dt>
              <dd className="flex-1 text-[19px]">
                {invited ? `${invited} ${invited === 1 ? "πρόσκληση" : "προσκλήσεις"}` : "Μόνο εσείς"}
              </dd>
              <dd>
                <Link href="/settings/team" className="min-h-11 content-center">
                  Διαχείριση<span className="sr-only"> ομάδας</span>
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </StaffSheet>
  );
}
