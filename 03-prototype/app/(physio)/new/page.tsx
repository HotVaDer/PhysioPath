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
import { speechEngine } from "@/app/lib/transcribe";

export const metadata: Metadata = { title: "Νέος ασθενής" };

export default async function RecordPage() {
  await connection(); // check on every visit, not once at build time
  const samples = await listSamples();
  const missingKey = !process.env.ANTHROPIC_API_KEY;
  const engine = speechEngine();
  const missingModel = engine === "local" && (!existsSync(WHISPER_MODEL) || !existsSync(VAD_MODEL)); // VAD stops sentences being skipped
  const missingAzure = engine === "azure" && (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION);
  const missingOpenAI = engine === "openai" && !process.env.OPENAI_API_KEY;

  return (
    <>
      <PageHeader step={0} title="Ηχογράφηση">
        Πείτε τις σημερινές ασκήσεις, όπως θα τις λέγατε στον ασθενή.{" "}
        {engine === "openai"
          ? "Ο ήχος μετατρέπεται σε κείμενο από υπηρεσία της OpenAI."
          : engine === "azure"
            ? "Ο ήχος μετατρέπεται σε κείμενο από υπηρεσία της Microsoft στην ΕΕ."
            : "Ο ήχος μένει σε αυτόν τον υπολογιστή· στέλνεται μόνο το κείμενο."}
      </PageHeader>

      {(missingKey || missingModel || missingAzure || missingOpenAI) && (
        <div className="mb-12 space-y-3">
          {missingKey && (
            <Alert tone="warning" title="Λείπει το κλειδί Claude API">
              Προσθέστε το στο <code className="font-mono">03-prototype/.env</code> και ξεκινήστε ξανά το <code className="font-mono">npm run dev</code>.
              Η ηχογράφηση και η μεταγραφή λειτουργούν ήδη.
            </Alert>
          )}
          {missingOpenAI && (
            <Alert tone="warning" title="Λείπει το κλειδί OpenAI">
              Προσθέστε <code className="font-mono">OPENAI_API_KEY</code> στο <code className="font-mono">03-prototype/.env</code> και ξεκινήστε ξανά
              το <code className="font-mono">npm run dev</code>.
            </Alert>
          )}
          {missingAzure && (
            <Alert tone="warning" title="Λείπει το κλειδί Azure Speech">
              Προσθέστε <code className="font-mono">AZURE_SPEECH_KEY</code> και <code className="font-mono">AZURE_SPEECH_REGION</code> στο{" "}
              <code className="font-mono">03-prototype/.env</code> και ξεκινήστε ξανά το <code className="font-mono">npm run dev</code>.
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
