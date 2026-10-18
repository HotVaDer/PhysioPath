// Layout for the physio's pages (record → review → approved). The "(physio)" folder groups them
// without adding to the address. They share the header and the draft; the patient page (/p/…) doesn't.
import type { ReactNode } from "react";

import { AppShell } from "@/app/components/layout/AppShell";
import { DraftProvider } from "@/app/context/DraftContext";

export default function PhysioLayout({ children }: { children: ReactNode }) {
  return (
    <DraftProvider>
      <AppShell>{children}</AppShell>
    </DraftProvider>
  );
}
