// Step 1 · Record today's plan (/new). A Server Component: it reads the sample notes and checks the setup on the server,
// then hands over to RecordScreen, which runs in the browser (microphone, typing, buttons).
import { existsSync } from "node:fs";

import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { Alert } from "@/app/components/ui/Alert";
import { RecordScreen } from "@/app/features/record/RecordScreen";
import { VAD_MODEL, WHISPER_MODEL } from "@/app/lib/config";
import { listSamples } from "@/app/lib/samples";

export const metadata: Metadata = { title: "Νέος ασθενής" };

export default async function RecordPage() {
  await connection(); // check on every visit, not once at build time
  const samples = await listSamples();
  const missingKey = !process.env.ANTHROPIC_API_KEY;
  const missingModel = !existsSync(WHISPER_MODEL) || !existsSync(VAD_MODEL); // VAD stops sentences being skipped

  return (
    <>
      <PageHeader step={0} title="Ηχογράφηση">
        Πείτε τις σημερινές ασκήσεις, όπως θα τις λέγατε στον ασθενή. Ο ήχος μένει σε αυτόν τον υπολογιστή· στέλνεται μόνο το κείμενο.
      </PageHeader>

      {(missingKey || missingModel) && (
        <div className="mb-12 space-y-3">
          {missingKey && (
            <Alert tone="warning" title="Λείπει το κλειδί Claude API">
              Προσθέστε το στο <code className="font-mono">03-prototype/.env</code> και ξεκινήστε ξανά το <code className="font-mono">npm run dev</code>.
              Η ηχογράφηση και η μεταγραφή λειτουργούν ήδη.
            </Alert>
          )}
          {missingModel && (
            <Alert tone="warning" title="Λείπουν τα μοντέλα μεταγραφής">
              Τρέξτε <code className="font-mono">npm run download-model</code>.
            </Alert>
          )}
        </div>
      )}

      <RecordScreen samples={samples} />
    </>
  );
}
