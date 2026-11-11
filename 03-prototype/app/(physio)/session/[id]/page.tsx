// Step 3 · Start: the session exists; show the patient how to open it. A QR code for their own phone,
// or "open here" for a clinic tablet. The physio chooses per patient.
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { Alert } from "@/app/components/ui/Alert";
import { ButtonLink } from "@/app/components/ui/Button";
import { patientUrl } from "@/app/lib/lan";
import { getSession } from "@/app/lib/sessions";

export const metadata: Metadata = { title: "Έναρξη" };

export default async function SessionStartPage(props: PageProps<"/session/[id]">) {
  await connection();
  const session = getSession((await props.params).id);
  if (!session) notFound();
  const { url, reachableFromPhones } = patientUrl(session.id);
  // Black on white whatever the theme, so every phone camera can read it.
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const name = session.program.patient_first_name;
  const screen = `/s/${session.id}` as Route;

  return (
    <>
      <PageHeader step={2} title="Έναρξη">
        Ο ασθενής ανοίγει τις σημερινές ασκήσεις στο κινητό του, ή εδώ, σε αυτή τη συσκευή. Εσείς βλέπετε την πρόοδό του στην αίθουσα.
      </PageHeader>

      <div className="grid items-start gap-12 md:grid-cols-[auto_1fr]">
        <section aria-labelledby="qr-heading">
          <h2 id="qr-heading" className="label text-muted">
            Στο κινητό του ασθενή
          </h2>
          {reachableFromPhones ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- a generated SVG, nothing to optimise */}
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`}
                width={288}
                height={288}
                alt={`Κωδικός QR για τις σημερινές ασκήσεις${name ? ` (${name})` : ""}`}
                className="mt-3 rounded-tile bg-white p-2"
              />
              <p className="mt-3 max-w-[18rem] text-muted">Ο ασθενής σκανάρει τον κωδικό με την κάμερα του κινητού του (στο ίδιο Wi-Fi).</p>
              <p className="mt-2 max-w-[18rem] font-mono text-sm break-all">{url}</p>
            </>
          ) : (
            <Alert tone="warning" title="Τα κινητά δεν βλέπουν αυτόν τον υπολογιστή" className="mt-3 max-w-md">
              Για να ανοίγει ο κωδικός QR από κινητό στο ίδιο Wi-Fi, ξεκινήστε τον server με <code className="font-mono">npm run dev:lan</code>. Μέχρι τότε,
              ανοίξτε την οθόνη του ασθενή εδώ.
            </Alert>
          )}
        </section>

        <section aria-labelledby="here-heading">
          <h2 id="here-heading" className="label text-muted">
            Ή σε αυτή τη συσκευή
          </h2>
          <p className="mt-3 max-w-md">Για tablet του φυσιοθεραπευτηρίου, ή όταν το κινητό του ασθενή δεν βοηθάει.</p>
          <ButtonLink href={screen} newTab size="lg" className="mt-4">
            Άνοιγμα οθόνης ασθενή
          </ButtonLink>

          <div className="mt-12 border-t border-border pt-6">
            <p className="text-lg">
              <span className="font-semibold">{name ?? "Ο ασθενής"}</span> · {session.program.exercises.length} ασκήσεις
            </p>
            <ButtonLink href="/" variant="primary" size="xl" className="mt-4">
              Στην αίθουσα
            </ButtonLink>
          </div>
        </section>
      </div>
    </>
  );
}
