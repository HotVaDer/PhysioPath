// Every text of «Δοκιμάστε το» (the /try page, the demo strip, the tips on the board), in Greek and
// English. The only bilingual part of the app for now: the screens inside it stay Greek. No translation
// library: one small dictionary is enough until the whole app is translated.
export type DemoLang = "el" | "en";

// ?lang=en → English; anything else (or nothing) → Greek.
export function pickLang(value: unknown): DemoLang {
  return value === "en" ? "en" : "el";
}

// The r= code in a link from an email or a message: a few letters, numbers and dashes, or nothing.
// Anything else is dropped (the database checks it again).
export function pickRef(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const ref = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(ref) ? ref : undefined;
}

// Days left before the demo is deleted, at least 1 while it is still there.
export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

const TEXT = {
  el: {
    pageTitle: "Δοκιμάστε το PhysioPath",
    switchLabel: "Γλώσσα",
    title: "Δοκιμάστε το PhysioPath",
    lead: "Μια κλινική δοκιμής, γεμάτη φανταστικούς ασθενείς, μόνο για εσάς. Χωρίς λογαριασμό, χωρίς email.",
    youWillSee: "Θα δείτε:",
    points: [
      "Την αίθουσα: ποιος ασκείται, ποιος έχει απορία, ποιος πονάει.",
      "Πώς η φωνή σας γίνεται κλινική σημείωση για τον ΓεΣΥ και πρόγραμμα για τον ασθενή.",
      "Τι βλέπει ο ασθενής στο κινητό του.",
    ],
    start: "Δοκιμάστε το τώρα",
    starting: "Ετοιμάζουμε την κλινική…",
    fine: "Η κλινική δοκιμής διαγράφεται μόνη της σε 7 μέρες. Χρησιμοποιήστε μόνο φανταστικούς ασθενείς.",
    signedIn: "Είστε ήδη συνδεδεμένοι με τον λογαριασμό σας.",
    toApp: "Στην εφαρμογή",
    haveAccount: "Έχετε ήδη λογαριασμό;",
    login: "Είσοδος",
    failed: "Δεν μπορέσαμε να ετοιμάσουμε την κλινική δοκιμής. Δοκιμάστε ξανά σε λίγο.",
    busy: "Πολλές δοκιμές από το ίδιο δίκτυο μέσα σε μία ώρα. Δοκιμάστε ξανά αργότερα.",
    captchaWait: "Περιμένετε να ολοκληρωθεί ο έλεγχος ασφαλείας (το κουτάκι πάνω από το κουμπί) και πατήστε ξανά.",
    captchaFailed: "Ο έλεγχος ασφαλείας δεν ολοκληρώθηκε. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.",
    // the strip on top of every page of the demo
    stripTitle: "Κλινική δοκιμής",
    stripText: (days: number) => `Φανταστικοί ασθενείς · διαγράφεται σε ${days === 1 ? "1 μέρα" : `${days} μέρες`}`,
    stripAppInGreek: null as string | null,
    own: "Θέλω τη δική μου κλινική",
    ownNote: "Η δοκιμή κλείνει και η δική σας κλινική ξεκινά καθαρή, χωρίς τους φανταστικούς ασθενείς.",
    leaving: "Μία στιγμή…",
    // the tips under the board
    tipsTitle: "Δοκιμάστε",
    tips: [
      "Μια κόκκινη κάρτα σημαίνει ότι κάποιος πονάει: πατήστε «Το είδα».",
      "«Νέα συνεδρία»: πείτε τις ασκήσεις φωναχτά, ή διαλέξτε ένα έτοιμο δείγμα, και δείτε τη σημείωση να γράφεται.",
      "Μετά την έγκριση, ανοίξτε τον σύνδεσμο του ασθενή (ή σκανάρετε το QR με άλλο κινητό): αυτό βλέπει ο ασθενής.",
    ],
    emptyBoard: "Η αίθουσα άδειασε.",
    refill: "Ξαναγέμισε την αίθουσα",
    refilling: "Μία στιγμή…",
    signOut: "Έξοδος από τη δοκιμή",
  },
  en: {
    pageTitle: "Try PhysioPath",
    switchLabel: "Language",
    title: "Try PhysioPath",
    lead: "A demo clinic full of fictional patients, just for you. No account, no email.",
    youWillSee: "You will see:",
    points: [
      "The room board: who is exercising, who has a question, who is in pain.",
      "How your voice becomes a clinical note (GeSY) and a home program for the patient.",
      "What the patient sees on their phone.",
    ],
    start: "Try it now",
    starting: "Setting up your clinic…",
    fine: "The demo clinic deletes itself after 7 days. Use fictional patients only.",
    signedIn: "You are already signed in with your account.",
    toApp: "Go to the app",
    haveAccount: "Already have an account?",
    login: "Sign in",
    failed: "We couldn't set up the demo clinic. Please try again in a moment.",
    busy: "Too many demos from the same network in one hour. Please try again later.",
    captchaWait: "Wait for the security check (the box above the button) to finish, then press again.",
    captchaFailed: "The security check didn't finish. Reload the page and try again.",
    stripTitle: "Demo clinic",
    stripText: (days: number) => `Fictional patients · deleted in ${days === 1 ? "1 day" : `${days} days`}`,
    stripAppInGreek: "The app's screens are in Greek for now; your demo patients are in English.",
    own: "I want my own clinic",
    ownNote: "The demo closes and your own clinic starts clean, without the fictional patients.",
    leaving: "One moment…",
    tipsTitle: "Try this",
    tips: [
      "A red card means someone is in pain: press «Το είδα» (“Seen”).",
      "«Νέα συνεδρία» (“New session”): say the exercises out loud, or pick a ready sample, and watch the note being written.",
      "After approving, open the patient's link (or scan the QR code with another phone): that is what the patient sees.",
    ],
    emptyBoard: "The room is empty.",
    refill: "Fill the room again",
    refilling: "One moment…",
    signOut: "Leave the demo",
  },
} as const;

export type DemoText = (typeof TEXT)[DemoLang];

export function demoText(lang: DemoLang): DemoText {
  return TEXT[lang];
}
