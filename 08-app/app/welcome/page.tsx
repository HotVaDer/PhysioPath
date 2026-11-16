// The front door for anyone not signed in. Full screen, not a card (2026-11-16, after the layout of
// the user's portfolio): a top bar with the logo and «Είσοδος», a big headline, one plain paragraph,
// the two choices, a large line-drawn Φ on the right, and the three steps as a strip along the bottom.
// Sized to fit one screen of an ordinary laptop (1280×650 and up, measured) without scrolling.
// Pages that need an account send signed-out people here. Someone already signed in skips it.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PaperLink } from "@/app/components/paper/Buttons";
import { HelpLine } from "@/app/components/paper/HelpLine";
import { Logo } from "@/app/components/paper/Logo";
import { currentUser, loadProfile } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Καλώς ήρθατε" };

// What the app does, in three short steps. It writes, the physio decides: nothing here may sound
// like it diagnoses or treats.
const STEPS = [
  { title: "Μιλάτε", text: "Στο τέλος της συνεδρίας λέτε τις ασκήσεις, όπως τις λέτε στον ασθενή." },
  { title: "Ελέγχετε", text: "Βλέπετε το πρόγραμμα και τη σημείωση, διορθώνετε και εγκρίνετε." },
  { title: "Έτοιμο", text: "Ο ασθενής παίρνει τις ασκήσεις στο κινητό του. Η σημείωση είναι έτοιμη για τον ΓεΣΥ." },
];

// The logo drawn large and thin, like a sketch on the desk. Decoration only.
function BigPhi() {
  return (
    <svg viewBox="0 0 420 420" aria-hidden="true" className="h-auto w-full max-w-[300px] xl:max-w-[340px]">
      <g fill="none" strokeLinecap="round">
        {/* a second, looser pencil line behind the oval */}
        <ellipse cx="214" cy="212" rx="152" ry="120" stroke="var(--color-hairline)" strokeWidth="2" strokeDasharray="3 9" />
        <ellipse cx="210" cy="210" rx="150" ry="118" stroke="var(--color-ink)" strokeWidth="3" opacity="0.55" />
        <line x1="210" y1="22" x2="210" y2="398" stroke="var(--color-action)" strokeWidth="6" />
        {/* where the limb meets the joint */}
        <circle cx="210" cy="92" r="7" fill="var(--color-desk)" stroke="var(--color-action)" strokeWidth="3" />
        <circle cx="210" cy="328" r="7" fill="var(--color-desk)" stroke="var(--color-action)" strokeWidth="3" />
      </g>
    </svg>
  );
}

export default async function WelcomePage() {
  const { supabase, user } = await currentUser();
  if (user) {
    const profile = await loadProfile(supabase, user.id);
    redirect(profile?.onboarded_at ? "/" : "/register/clinic");
  }

  return (
    <div className="flex min-h-screen flex-col bg-desk">
      <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-8 sm:py-4">
        <Logo />
        <Link href="/login" className="flex min-h-11 items-center font-semibold">
          Είσοδος
        </Link>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 pb-6 sm:px-8">
        <div className="grid flex-1 items-center gap-x-10 gap-y-4 py-4 sm:py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <div className="flex flex-col gap-4 sm:gap-5">
            <h1 className="font-display text-[38px] leading-[1.08] tracking-[-0.01em] sm:text-[48px] lg:text-[54px]">
              Μιλάτε.
              <br />
              Το PhysioPath γράφει<span className="text-action">.</span>
            </h1>
            <p className="max-w-[40em] text-lg leading-[1.55] sm:text-[19px]">
              Το PhysioPath είναι ένα εργαλείο για φυσιοθεραπευτές. Λέτε τις ασκήσεις στο τέλος της συνεδρίας, και ετοιμάζει
              το πρόγραμμα του ασθενή και τη σημείωση για τον ΓεΣΥ. Εσείς ελέγχετε και εγκρίνετε.
            </p>

            <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start">
              <div className="flex flex-col gap-1 sm:w-[300px] sm:flex-none">
                <PaperLink href="/register" className="w-full justify-center whitespace-nowrap py-2 text-center">
                  Νέα κλινική · Εγγραφή
                </PaperLink>
                <p className="text-muted">Πρώτη φορά; Περίπου 3 λεπτά.</p>
              </div>
              <div className="flex flex-col gap-1 sm:w-[300px] sm:flex-none">
                <PaperLink href="/login" variant="outline" className="w-full justify-center whitespace-nowrap py-2 text-center">
                  Έχω λογαριασμό · Είσοδος
                </PaperLink>
                <p className="text-muted">Κωδικός στο email, χωρίς συνθηματικό.</p>
              </div>
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <BigPhi />
          </div>
        </div>

        <section aria-labelledby="how" className="border-t-2 border-ink">
          <h2 id="how" className="sr-only">
            Πώς δουλεύει
          </h2>
          <ol className="grid sm:grid-cols-3">
            {STEPS.map(({ title, text }, i) => (
              <li
                key={title}
                className="flex flex-col gap-1 border-b border-hairline py-3 sm:border-b-0 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0"
              >
                <span className="flex items-center gap-2.5 font-semibold">
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 flex-none place-items-center rounded-full bg-action text-white"
                  >
                    {i + 1}
                  </span>
                  {title}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <HelpLine />
      </main>
    </div>
  );
}
