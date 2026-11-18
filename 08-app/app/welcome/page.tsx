// The front door for anyone not signed in. Full screen, not a card (2026-11-16, after the layout of
// the user's portfolio): a top bar with the logo and «Είσοδος», a big headline, one plain paragraph,
// the two choices, a large Φ on the right that acts out the headline (SpeakingPhi, 2026-11-18),
// and the three steps as a strip along the bottom.
// Sized to fit one screen of an ordinary laptop (1280×650 and up, measured) without scrolling.
// Pages that need an account send signed-out people here. Someone already signed in skips it.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PaperLink } from "@/app/components/paper/Buttons";
import { HelpLine } from "@/app/components/paper/HelpLine";
import { Logo } from "@/app/components/paper/Logo";
import { SpeakingPhi } from "@/app/components/paper/SpeakingPhi";
import { currentUser, loadProfile } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Καλώς ήρθατε" };

// What the app does, in three short steps. It writes, the physio decides: nothing here may sound
// like it diagnoses or treats.
const STEPS = [
  {
    title: "Μιλάτε",
    text: "Στο τέλος της συνεδρίας λέτε τις ασκήσεις, όπως τις λέτε στον ασθενή.",
  },
  {
    title: "Ελέγχετε",
    text: "Βλέπετε το πρόγραμμα και τη σημείωση, διορθώνετε και εγκρίνετε.",
  },
  {
    title: "Έτοιμο",
    text: "Ο ασθενής παίρνει τις ασκήσεις στο κινητό του. Η σημείωση είναι έτοιμη για τον ΓεΣΥ.",
  },
];

export default async function WelcomePage() {
  const { supabase, user } = await currentUser();
  if (user) {
    const profile = await loadProfile(supabase, user.id);
    redirect(profile?.onboarded_at ? "/" : "/register/clinic");
  }

  return (
    // The same as every other page: the desk with the faint «Φ» marks, and the content on one paper sheet.
    <div className="desk-pattern flex min-h-dvh flex-col justify-center px-3 py-3 sm:px-4 sm:py-6 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col bg-sheet px-5 pb-5 pt-3 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:px-10 sm:pb-7 sm:pt-5">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-2 border-hairline pb-2.5">
          <Logo />
          <Link
            href="/login"
            className="flex min-h-11 items-center font-semibold"
          >
            Είσοδος
          </Link>
        </header>

        <main id="main" className="flex flex-col">
          <div className="grid flex-1 items-center gap-x-10 gap-y-4 py-4 sm:py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <div className="flex flex-col gap-4 sm:gap-5">
              <h1 className="font-display text-[38px] leading-[1.08] tracking-[-0.01em] sm:text-[48px] lg:text-[54px]">
                Μιλάτε.
                <br />
                Το PhysioPath γράφει<span className="text-action">.</span>
              </h1>
              <p className="max-w-[40em] text-lg leading-[1.55] sm:text-[19px]">
                Το PhysioPath είναι ένα εργαλείο για φυσιοθεραπευτές. Λέτε τις
                ασκήσεις στο τέλος της συνεδρίας, και ετοιμάζει το πρόγραμμα του
                ασθενή και τη σημείωση για τον ΓεΣΥ. Εσείς ελέγχετε και
                εγκρίνετε.
              </p>

              <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-1 sm:w-[300px] sm:flex-none">
                  <PaperLink
                    href="/register"
                    className="w-full justify-center whitespace-nowrap py-2 text-center"
                  >
                    Νέα κλινική · Εγγραφή
                  </PaperLink>
                  <p className="text-muted">Πρώτη φορά; Περίπου 3 λεπτά.</p>
                </div>
                <div className="flex flex-col gap-1 sm:w-[300px] sm:flex-none">
                  <PaperLink
                    href="/login"
                    variant="outline"
                    className="w-full justify-center whitespace-nowrap py-2 text-center"
                  >
                    Έχω λογαριασμό · Είσοδος
                  </PaperLink>
                  <p className="text-muted">
                    Κωδικός στο email, χωρίς συνθηματικό.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden justify-center lg:flex">
              <SpeakingPhi />
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
    </div>
  );
}
