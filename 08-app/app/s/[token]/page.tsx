// /s/<token>: the patient's session on their own phone, opened from the QR code on the approved page.
// No login and no staff bar; only the patient's part of the session (never the clinical note).
// The first screen is drawn on the server, so it shows up before a slow phone has run any JavaScript.
// noindex + no-referrer: the link is the patient's key, so it must not end up in a search engine or be
// passed on to another site.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { TourNotes } from "@/app/components/demo/TourNotes";
import { TEXT_SIZE_SCRIPT } from "@/app/components/patient/TextSize";
import { loadPatientView } from "@/app/lib/board/patient";
import { SessionScreen } from "@/app/s/[token]/SessionScreen";

export const metadata: Metadata = {
  title: "Η συνεδρία σας",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SessionPage({ params }: PageProps<"/s/[token]">) {
  await connection(); // live data: read it on every visit, never from a cache
  const { token } = await params;
  const view = await loadPatientView(token);
  if (!view) notFound();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      <SessionScreen token={token} initial={view} />
      {/* The demo's sticky notes, only in the browser that is doing the demo's tour (nothing otherwise). */}
      <TourNotes />
    </>
  );
}
