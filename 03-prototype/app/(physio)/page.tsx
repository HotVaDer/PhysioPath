// The room board (/): every patient whose session is running. The physio's home screen during
// the working day; "Νέος ασθενής" starts the next one.
import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { RoomBoard } from "@/app/features/room/RoomBoard";
import { listSessions } from "@/app/lib/sessions";

export const metadata: Metadata = { title: "Η αίθουσα" };

export default async function RoomPage() {
  await connection(); // live data: read it on every visit
  return (
    <>
      <PageHeader title="Η αίθουσα">Οι ασθενείς που κάνουν ασκήσεις τώρα. Όταν κάποιος σας χρειάζεται, το βλέπετε εδώ.</PageHeader>
      <RoomBoard initial={listSessions()} initialNow={new Date().toISOString()} />
    </>
  );
}
