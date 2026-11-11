"use client";
// The body of the /ui catalogue. A Client Component because the fields and choices
// keep what you type and pick, so you can try them.
import { useId, useState, type ReactNode } from "react";

import { Alert } from "@/app/components/ui/Alert";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { CheckIcon, CopyIcon, PlusIcon, TrashIcon, UndoIcon } from "@/app/components/ui/icons";
import { ListField } from "@/app/components/ui/ListField";
import { SegmentedControl } from "@/app/components/ui/SegmentedControl";
import { Spinner } from "@/app/components/ui/Spinner";
import { Stepper } from "@/app/components/ui/Stepper";
import { TextArea } from "@/app/components/ui/TextArea";
import { TextField } from "@/app/components/ui/TextField";
import { TimingStrip } from "@/app/components/ui/TimingStrip";

const ENTRIES = [
  "Button",
  "ButtonLink",
  "TextField",
  "TextArea",
  "ListField",
  "SegmentedControl",
  "Alert",
  "Card",
  "Spinner",
  "Stepper",
  "TimingStrip",
] as const;

const number = (name: (typeof ENTRIES)[number]) => String(ENTRIES.indexOf(name) + 1).padStart(2, "0");

// One component: number tag + name, what it's for, where it's used, then its examples.
// Open on the page (no box), separated from the next one by a hairline.
function Entry({ name, purpose, usedIn, children }: { name: (typeof ENTRIES)[number]; purpose: ReactNode; usedIn: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section id={name.toLowerCase()} aria-labelledby={headingId} className="scroll-mt-6 border-t border-border pt-10">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[18rem_1fr]">
        <div>
          <p className="label flex items-center gap-3 text-muted">
            <span className="rounded-full bg-primary px-2 py-0.5 text-on-primary">{number(name)}</span> Component
          </p>
          <h2 id={headingId} className="mt-3 text-3xl font-bold">
            {name}
          </h2>
          <p className="mt-2 text-muted">{purpose}</p>
          <p className="mt-4">
            <span className="label block text-muted">Used in</span>
            <span className="mt-0.5 block">{usedIn}</span>
          </p>
        </div>
        <div lang="el" className="space-y-7">
          {children}
        </div>
      </div>
    </section>
  );
}

// One example: a small caption, then the component.
function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p lang="en" className="label mb-2.5 text-muted">
        <span aria-hidden="true" className="text-primary-text">
          ›{" "}
        </span>
        {label}
      </p>
      {children}
    </div>
  );
}

export function Gallery() {
  const [avoid, setAvoid] = useState(["Σκάλες χωρίς κουπαστή", "Τρέξιμο"]);
  const [lang, setLang] = useState<"el" | "en">("el");
  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">("normal");

  return (
    <>
      <nav aria-label="Components" className="mt-12 border-y border-border py-4">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {ENTRIES.map((name) => (
            <li key={name}>
              <a href={`#${name.toLowerCase()}`} className="label text-muted no-underline hover:text-primary-text">
                <span className="text-primary-text">{number(name)}</span> {name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-16 space-y-16">
        <Entry name="Button" purpose="Every action. Each page has one teal main action; everything else is secondary or quiet." usedIn="Every page">
          <Example label="Main · secondary · quiet">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" icon={<CheckIcon />}>
                Έγκριση
              </Button>
              <Button icon={<PlusIcon />}>Προσθήκη άσκησης</Button>
              <Button variant="ghost" icon={<CopyIcon />}>
                Αντιγραφή σημείωσης
              </Button>
            </div>
          </Example>
          <Example label="Destructive · busy · disabled">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" icon={<TrashIcon />}>
                Αφαίρεση
              </Button>
              <Button variant="primary" loading>
                Δημιουργία
              </Button>
              <Button disabled>Έγκριση</Button>
            </div>
          </Example>
        </Entry>

        <Entry name="ButtonLink" purpose="Looks like a button but goes to another page. Says in words when it opens a new tab." usedIn="Approved page">
          <Example label="Opens a new tab">
            <ButtonLink href="/" newTab>
              Άνοιγμα σελίδας ασθενή
            </ButtonLink>
          </Example>
        </Entry>

        <Entry name="TextField" purpose="One-line input with its label above. Missing values are said in words, not only with colour." usedIn="Review page: title, sets, reps, how often">
          <div className="grid gap-6 sm:grid-cols-2">
            <Example label="Filled in">
              <TextField label="Σετ" inputMode="numeric" defaultValue="3" />
            </Example>
            <Example label="Missing from the note">
              <TextField label="Πόσο συχνά" missing />
            </Example>
            <Example label="Error">
              <TextField label="Επαναλήψεις" defaultValue="δέκα" error="Γράψτε έναν αριθμό, π.χ. 10." />
            </Example>
            <Example label="With a hint">
              <TextField label="Κράτημα" hint="Προαιρετικό." placeholder="π.χ. 5 δευτερόλεπτα" />
            </Example>
          </div>
        </Entry>

        <Entry name="TextArea" purpose="Multi-line input. Grows with its text, so nothing hides behind a scrollbar." usedIn="Record page: transcript · Review page: clinical note">
          <Example label="With a hint">
            <TextArea
              label="Κείμενο"
              hint="Μπορείτε να το διορθώσετε."
              defaultValue="Ο Γιώργος, αριστερό γόνατο, τρίτη εβδομάδα μετά από αρθροσκόπηση. Straight leg raises, τρία σετ των δέκα, δύο φορές τη μέρα."
            />
          </Example>
        </Entry>

        <Entry name="ListField" purpose="A list typed one item per line. The page receives a clean list, without empty lines." usedIn="Review page: avoid, after the exercises, call us if…">
          <Example label="Try adding a line">
            <ListField label="Αποφύγετε" value={avoid} onChange={setAvoid} />
          </Example>
        </Entry>

        <Entry name="SegmentedControl" purpose="Pick one of 2–3 options. Real radio buttons, so arrow keys work; the chosen one is teal with a ✓." usedIn="Record page: note language · Patient page: text size">
          <Example label="Two options">
            <SegmentedControl
              legend="Γλώσσα κλινικής σημείωσης"
              options={[
                { value: "el", label: "Ελληνικά" },
                { value: "en", label: "English" },
              ]}
              value={lang}
              onChange={setLang}
            />
          </Example>
          <Example label="Three options">
            <SegmentedControl
              legend="Μέγεθος γραμμάτων"
              options={[
                { value: "normal", label: "Μικρά" },
                { value: "large", label: "Μεσαία" },
                { value: "xlarge", label: "Μεγάλα" },
              ]}
              value={textSize}
              onChange={setTextSize}
            />
          </Example>
        </Entry>

        <Entry name="Alert" purpose="A message that stays until it's no longer true. The tag names the kind of message, so colour is never the only clue." usedIn="Every page">
          <Example label="Four kinds">
            <div className="space-y-3">
              <Alert title="Μόνο το κείμενο στέλνεται">Ο ήχος μένει σε αυτόν τον υπολογιστή.</Alert>
              <Alert tone="success" title="Το πρόγραμμα εγκρίθηκε" />
              <Alert tone="warning" title="2 ερωτήσεις για εσάς">
                Πόσα σετ για τα quad sets; Πόσο συχνά τα heel slides;
              </Alert>
              <Alert tone="danger" title="Δεν ήταν δυνατή η μεταγραφή">
                Ηχογραφήστε ξανά, λίγο πιο κοντά στο μικρόφωνο.
              </Alert>
            </div>
          </Example>
          <Example label="With undo">
            <Alert
              title="Η άσκηση «Γέφυρα» αφαιρέθηκε"
              action={
                <Button variant="ghost" icon={<UndoIcon />}>
                  Αναίρεση
                </Button>
              }
            />
          </Example>
        </Entry>

        <Entry name="Card" purpose="One part of a page: a white card with soft corners and a titled heading. Screen readers can jump between them." usedIn="Every page">
          <Example label="With a tag">
            <Card title="Ασκήσεις" tag="S1" headingLevel={3}>
              <p>Εδώ μπαίνει το περιεχόμενο της ενότητας.</p>
            </Card>
          </Example>
        </Entry>

        <Entry name="Spinner" purpose="Shown while waiting: a calm teal ring turning slowly. The text says what's happening, so it works without the animation too." usedIn="Record page: while transcribing and writing">
          <Example label="Waiting">
            <Spinner label="Γράφεται το πρόγραμμα…">Συνήθως 5–15 δευτερόλεπτα.</Spinner>
          </Example>
        </Entry>

        <Entry name="Stepper" purpose="Where the physio is in the flow: record → review → approve." usedIn="Top of the physio's pages">
          <Example label="On step 2">
            <Stepper steps={["Ηχογράφηση", "Έλεγχος", "Έγκριση"]} current={1} />
          </Example>
        </Entry>

        <Entry name="TimingStrip" purpose="A row of measurements on a soft panel. Shows how fast the demo was." usedIn="Record page, after the program is ready">
          <Example label="After a voice note">
            <TimingStrip
              items={[
                { label: "Ηχογράφηση", value: "0:42" },
                { label: "Μεταγραφή", value: "1,8 δευτ." },
                { label: "Πρόγραμμα", value: "15,7 δευτ." },
                { label: "Σύνολο", value: "17,5 δευτ.", highlight: true },
              ]}
            />
          </Example>
        </Entry>
      </div>
    </>
  );
}
