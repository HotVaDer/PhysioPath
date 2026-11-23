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
    // the guided tour: on the board (DemoGuide) and a line on every other page (DemoCoach)
    tourLabel: "Ξενάγηση",
    stepOf: (n: number, of: number) => `Βήμα ${n} από ${of}`,
    introTitle: "Καλώς ήρθατε στο PhysioPath",
    introText:
      "Το PhysioPath είναι ένα εργαλείο για φυσιοθεραπευτές. Στο τέλος της συνεδρίας λέτε τις ασκήσεις φωναχτά, και γράφει τη σημείωση για τον ΓεΣΥ και το πρόγραμμα του ασθενή για το σπίτι. Εσείς ελέγχετε και εγκρίνετε. Στην αίθουσα βλέπετε σε μία οθόνη ποιος ασκείται, ποιος έχει απορία και ποιος πονάει.",
    introSmall: "Η ξενάγηση έχει 3 βήματα και παίρνει περίπου 2 λεπτά.",
    introStart: "Ξεκινάμε",
    steps: [
      {
        title: "Μιλάτε. Το PhysioPath γράφει.",
        text: "Κάντε μια συνεδρία με τη φωνή σας: διαλέξτε ασθενή και πείτε τις ασκήσεις φωναχτά, όπως τις λέτε στον ασθενή. Σε περίπου 15 δευτερόλεπτα έχετε τη σημείωση για τον ΓεΣΥ και το πρόγραμμα για το σπίτι.",
        action: "Νέα συνεδρία με φωνή",
      },
      {
        title: "Γίνετε ο ασθενής",
        text: "Ανοίξτε την οθόνη που βλέπει ο ασθενής στο κινητό του. Πατήστε «Χρειάζομαι τον φυσιοθεραπευτή» και μετά «Πονάω». Γυρίστε στην αίθουσα: η κάρτα του γίνεται κόκκινη μέσα σε 3 δευτερόλεπτα.",
        action: "Άνοιξε την οθόνη του ασθενή",
      },
      {
        title: "Η αίθουσα σάς ειδοποιεί",
        text: "Η κάρτα του ασθενή έγινε κόκκινη, και η σειρά του είναι στο «Σας χρειάζονται». Πατήστε «Το είδα» στην κάρτα του: το κινητό του δείχνει αμέσως ότι το είδατε.",
        action: "Δείξε μου την κάρτα",
      },
    ],
    // one line on the other pages, while step 1 or 2 is on
    coach: {
      new: "Διαλέξτε έναν ασθενή, π.χ. τον Γιώργο Π., ή γράψτε ένα όνομα για νέο ασθενή, και πατήστε «Συνέχεια».",
      program: "Πατήστε «Αλλαγή προγράμματος» για να πείτε νέες ασκήσεις.",
      record:
        "Πατήστε «Έναρξη ηχογράφησης» και πείτε τις ασκήσεις φωναχτά, ή πατήστε ένα έτοιμο δείγμα πιο κάτω. Μετά «Δημιουργία προγράμματος».",
      review:
        "Το πρόγραμμα και η σημείωση γράφτηκαν από τη φωνή σας. Ρίξτε μια ματιά, διαλέξτε κρεβάτι στην αίθουσα και πατήστε «Έγκριση» στο τέλος.",
      programPage:
        "Εγκρίθηκε! Αυτό παίρνει ο ασθενής. Ανοίξτε τον σύνδεσμο για το κινητό πιο κάτω (ή σκανάρετε το QR με το κινητό σας), πατήστε «Χρειάζομαι τον φυσιοθεραπευτή» → «Πονάω», και μετά γυρίστε στην «Αίθουσα».",
      other: "Συνεχίστε την ξενάγηση από την αίθουσα.",
      back: "Στην ξενάγηση",
    },
    doneTitle: "Αυτό είναι το PhysioPath",
    doneText: "Η σημείωση από τη φωνή σας, το κινητό του ασθενή και η αίθουσα σε μία οθόνη. Θέλετε το ίδιο για τη δική σας κλινική;",
    stepDone: "Έγινε",
    skip: "Παράλειψη",
    again: "Ξανά από την αρχή",
    emptyBoard: "Η αίθουσα άδειασε.",
    refill: "Ξαναγέμισε την αίθουσα",
    refilling: "Μία στιγμή…",
    signOut: "Έξοδος",
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
    tourLabel: "Guided tour",
    stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
    introTitle: "Welcome to PhysioPath",
    introText:
      "PhysioPath is a tool for physiotherapists. At the end of a session you say the exercises out loud, and it writes the GeSY clinical note and the patient's home program. You check and approve. In the room, one screen shows who is exercising, who has a question and who is in pain.",
    introSmall: "The tour has 3 steps and takes about 2 minutes.",
    introStart: "Let's start",
    steps: [
      {
        title: "You speak. PhysioPath writes.",
        text: "Do a session by voice: pick a patient and say the exercises out loud, the way you tell the patient. In about 15 seconds you have the GeSY note and the home program.",
        action: "New session by voice",
      },
      {
        title: "Be the patient",
        text: "Open the screen the patient sees on their phone. Press «Χρειάζομαι τον φυσιοθεραπευτή» (“I need the physio”), then «Πονάω» (“I'm in pain”). Come back to the room: their card turns red within 3 seconds.",
        action: "Open the patient's screen",
      },
      {
        title: "The room tells you",
        text: "The patient's card turned red and they are listed under «Σας χρειάζονται» (“Need you”). Press «Το είδα» (“Seen”) on their card: their phone shows at once that you saw it.",
        action: "Show me the card",
      },
    ],
    coach: {
      new: "Pick a patient, e.g. Γιώργος Π., or type a name for a new patient, and press «Συνέχεια» (“Continue”).",
      program: "Press «Αλλαγή προγράμματος» (“Change program”) to say new exercises.",
      record:
        "Press «Έναρξη ηχογράφησης» (“Start recording”) and say the exercises out loud, or tap a ready sample below. Then «Δημιουργία προγράμματος» (“Create program”).",
      review:
        "The program and the note were written from your voice. Have a look, pick a bed in the room and press «Έγκριση» (“Approve”) at the end.",
      programPage:
        "Approved! This is what the patient gets. Open the phone link below (or scan the QR with your phone), press «Χρειάζομαι τον φυσιοθεραπευτή» → «Πονάω», then come back to «Αίθουσα» (“Room”).",
      other: "Continue the tour from the room.",
      back: "Back to the tour",
    },
    doneTitle: "That's PhysioPath",
    doneText: "The note from your voice, the patient's phone and the room on one screen. Want the same for your own clinic?",
    stepDone: "Done",
    skip: "Skip",
    again: "Start the tour again",
    emptyBoard: "The room is empty.",
    refill: "Fill the room again",
    refilling: "One moment…",
    signOut: "Exit",
  },
} as const;

export type DemoText = (typeof TEXT)[DemoLang];

export function demoText(lang: DemoLang): DemoText {
  return TEXT[lang];
}
