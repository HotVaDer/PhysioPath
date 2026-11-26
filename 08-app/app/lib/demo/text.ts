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
    // ?lost=1: the board got no login right after the button (a browser inside an app that didn't keep it)
    lost: "Η κλινική δοκιμής ετοιμάστηκε, αλλά αυτός ο browser δεν κράτησε τη σύνδεση. Πατήστε ξανά το κουμπί. Αν ξαναγίνει, πατήστε τις τρεις τελείες πάνω δεξιά και «Άνοιγμα σε Chrome» ή «Άνοιγμα σε Safari».",
    // the strip on top of every page of the demo
    stripTitle: "Κλινική δοκιμής",
    stripText: (days: number) => `Φανταστικοί ασθενείς · διαγράφεται σε ${days === 1 ? "1 μέρα" : `${days} μέρες`}`,
    stripAppInGreek: null as string | null,
    stripLeft: (programs: number, recordings: number, of: number) =>
      `Μένουν ${programs} από ${of} προγράμματα και ${recordings} από ${of} ηχογραφήσεις`,
    own: "Θέλω τη δική μου κλινική",
    ownNote: "Η δοκιμή κλείνει και η δική σας κλινική ξεκινά καθαρή, χωρίς τους φανταστικούς ασθενείς.",
    leaving: "Μία στιγμή…",
    // the guided tour: on the board (DemoGuide) and a line on every other page (DemoCoach)
    tourLabel: "Ξενάγηση",
    stepOf: (n: number, of: number) => `Βήμα ${n} από ${of}`,
    stepShort: (n: number, of: number) => `${n}/${of}`,
    introTitle: "Καλώς ήρθατε στο PhysioPath",
    introText:
      "Μιλάτε 30 δευτερόλεπτα στο τέλος της συνεδρίας. Το PhysioPath γράφει τη σημείωση για τον ΓεΣΥ και το πρόγραμμα του ασθενή. Εσείς αποφασίζετε και εγκρίνετε.",
    introSmall: "3 βήματα, περίπου 2 λεπτά.",
    introAfter: "Μετά: το ημερολόγιο στο σπίτι, πρότυπα, χαρτί για τον ασθενή.",
    introStart: "Ξεκινάμε",
    steps: [
      {
        title: "Μιλάτε. Το PhysioPath γράφει.",
        text: "Διαλέξτε τον Γιώργο Π., πατήστε «Αλλαγή προγράμματος» και πείτε τις ασκήσεις, ή πατήστε το έτοιμο δείγμα. Σε περίπου 15 δευτερόλεπτα έχετε τη σημείωση για τον ΓεΣΥ και το πρόγραμμα για το σπίτι.",
        action: "Νέα συνεδρία με φωνή",
      },
      {
        title: "Γίνετε ο ασθενής",
        text: "Ανοίξτε την οθόνη του ασθενή στο κινητό. Πατήστε «Χρειάζομαι τον φυσιοθεραπευτή» και μετά «Πονάω». Γυρίστε στην αίθουσα: η κάρτα του γίνεται κόκκινη σε 3 δευτερόλεπτα.",
        action: "Άνοιξε την οθόνη του ασθενή",
      },
      {
        title: "Η αίθουσα σάς ειδοποιεί",
        text: "Η κάρτα του ασθενή έγινε κόκκινη και μπήκε στο «Σας χρειάζονται». Πατήστε «Το είδα» στην κάρτα: το κινητό του δείχνει αμέσως ότι το είδατε.",
        action: "Δείξε μου την κάρτα",
      },
    ],
    // one line on the other pages, while step 1 or 2 is on
    coach: {
      new: "Διαλέξτε τον Γιώργο Π. και πατήστε «Συνέχεια».",
      program: "Πατήστε «Αλλαγή προγράμματος» για να πείτε νέες ασκήσεις.",
      record:
        "Πατήστε «Έναρξη ηχογράφησης» και πείτε τις ασκήσεις φωναχτά. Χωρίς μικρόφωνο: πατήστε το δείγμα «Γιώργος · αριστερό γόνατο». Μετά «Δημιουργία προγράμματος».",
      toSample: "Στο δείγμα",
      review:
        "Πάνω το πρόγραμμα του ασθενή, πιο κάτω η σημείωση για τον ΓεΣΥ σε 4 μέρη. Στο τέλος διαλέξτε κωδικό πράξης (π.χ. PHYS02) και κρεβάτι, και πατήστε «Έγκριση».",
      toNote: "Η σημείωση ΓεΣΥ",
      programPage:
        "Εγκρίθηκε! Ανοίξτε τον σύνδεσμο για το κινητό πιο κάτω (ή σκανάρετε το QR), πατήστε «Χρειάζομαι τον φυσιοθεραπευτή» → «Πονάω», και γυρίστε στην «Αίθουσα».",
      other: "Συνεχίστε την ξενάγηση από την αίθουσα.",
      back: "Στην ξενάγηση",
      // after the tour, on the pages of «Δείτε και αυτά»
      templates:
        "Τα πρότυπα της κλινικής. Ανοίξτε ένα για να δείτε τις ασκήσεις. Στη «Νέα συνεδρία» ξεκινάτε από ένα και λέτε μόνο τι αλλάζει.",
      dictate: "Πατήστε το παράδειγμα «Τρία πρότυπα» και μετά «Δημιουργία προτύπων». Ελέγξτε τις κάρτες και αποθηκεύστε.",
      recordTemplate: "Διαλέξτε ένα πρότυπο πάνω, «Όπως είναι», και πείτε μόνο τι κάνατε σήμερα.",
      diary: "Το ημερολόγιο του ασθενή: τι έκανε κάθε μέρα στο σπίτι και πόσο πονούσε. Πόνος 7 και πάνω σάς ειδοποιεί.",
    },
    // the sticky notes next to the button to press (TourNotes; which one: app/lib/demo/notes.ts)
    notes: {
      pickPatient: "Πατήστε τον Γιώργο Π.",
      continue: "Τώρα «Συνέχεια».",
      changeProgram: "«Αλλαγή προγράμματος»: λέτε τις νέες ασκήσεις.",
      sample: "Πατήστε ένα έτοιμο δείγμα, ή «Έναρξη ηχογράφησης» και πείτε τις ασκήσεις φωναχτά.",
      record: "Πατήστε και πείτε τις ασκήσεις φωναχτά, όπως τις λέτε στον ασθενή.",
      generate: "Πατήστε εδώ. Σε περίπου 15 δευτερόλεπτα έχετε σημείωση και πρόγραμμα.",
      code: "Αυτή είναι η σημείωση για τον ΓεΣΥ, σε 4 μέρη, από τη φωνή σας. Διαλέξτε κωδικό πράξης, π.χ. PHYS02.",
      bed: "Διαλέξτε κρεβάτι: εκεί θα εμφανιστεί ο ασθενής στην αίθουσα.",
      approve: "Πατήστε «Έγκριση». Τίποτα δεν φτάνει στον ασθενή πριν από αυτό.",
      phoneLink: "Ανοίξτε την οθόνη του ασθενή από εδώ (ή σκανάρετε το QR με το κινητό σας).",
      needPhysio: "Τώρα είστε ο ασθενής. Πατήστε εδώ…",
      pain: "…και «Πονάω».",
      backToRoom: "Στάλθηκε! Γυρίστε στην αίθουσα: η κάρτα του έγινε κόκκινη.",
      seen: "Πατήστε «Το είδα»: το κινητό του ασθενή το δείχνει αμέσως.",
      toRoom: "Στην αίθουσα",
      show: "Δείξε μου",
      close: "Κλείσιμο σημειώσεων ξενάγησης",
    },
    // the end of the tour: optional, one line each (DemoGuide); ✓ once the page was opened
    extrasTitle: "Δείτε και αυτά",
    extrasNote: "προαιρετικά",
    extras: {
      diary: { title: "Ημερολόγιο στο σπίτι", text: "Ποιος έκανε τις ασκήσεις του στο σπίτι, και ποιος πόνεσε." },
      templates: { title: "Πρότυπα", text: "Ξεκινήστε μια συνεδρία από έτοιμο πρότυπο της κλινικής και πείτε μόνο τι αλλάζει." },
      dictate: {
        title: "Πείτε τα πρότυπά σας",
        text: "Τα προγράμματα που δίνετε συχνά, μία φορά, και γίνονται πρότυπα. Παίρνει 1 από τα 5 προγράμματα της δοκιμής.",
      },
      print: { title: "Χαρτί για τον ασθενή", text: "Για ασθενή χωρίς κινητό: το πρόγραμμα σε χαρτί, με κουτάκια για 2 εβδομάδες." },
    },
    extraOpen: "Άνοιγμα",
    extraSeen: "Το είδατε",
    doneTitle: "Αυτό είναι το PhysioPath",
    doneText:
      "Ο φυσιοθεραπευτής αποφασίζει, το PhysioPath γράφει. Η κλινική βλέπει όλη την αίθουσα σε μία οθόνη, και ποιος ασκείται στο σπίτι. Θέλετε το ίδιο για τη δική σας κλινική;",
    stepDone: "Έγινε",
    skip: "Παράλειψη",
    restart: "Από την αρχή",
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
    lost: "Your demo clinic was set up, but this browser didn't keep you signed in. Press the button again. If it happens again, tap the three dots at the top right and choose «Open in Chrome» or «Open in Safari».",
    stripTitle: "Demo clinic",
    stripText: (days: number) => `Fictional patients · deleted in ${days === 1 ? "1 day" : `${days} days`}`,
    stripAppInGreek: "The app's screens are in Greek for now; your demo patients are in English.",
    stripLeft: (programs: number, recordings: number, of: number) =>
      `${programs} of ${of} programs and ${recordings} of ${of} recordings left`,
    own: "I want my own clinic",
    ownNote: "The demo closes and your own clinic starts clean, without the fictional patients.",
    leaving: "One moment…",
    tourLabel: "Guided tour",
    stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
    stepShort: (n: number, of: number) => `${n}/${of}`,
    introTitle: "Welcome to PhysioPath",
    introText:
      "You talk for 30 seconds at the end of the session. PhysioPath writes the GeSY clinical note and the patient's home program. You decide and approve.",
    introSmall: "3 steps, about 2 minutes.",
    introAfter: "Then: the home diary, templates, a paper sheet for the patient.",
    introStart: "Let's start",
    steps: [
      {
        title: "You speak. PhysioPath writes.",
        text: "Pick George P., press «Αλλαγή προγράμματος» (“Change program”) and say the exercises, or tap the ready sample. In about 15 seconds you have the GeSY note and the home program.",
        action: "New session by voice",
      },
      {
        title: "Be the patient",
        text: "Open the patient's phone screen. Press «Χρειάζομαι τον φυσιοθεραπευτή» (“I need the physio”), then «Πονάω» (“I'm in pain”). Come back to the room: their card turns red within 3 seconds.",
        action: "Open the patient's screen",
      },
      {
        title: "The room tells you",
        text: "The patient's card turned red and moved into «Σας χρειάζονται» (“Need you”). Press «Το είδα» (“Seen”) on the card: their phone shows at once that you saw it.",
        action: "Show me the card",
      },
    ],
    coach: {
      new: "Pick George P. and press «Συνέχεια» (“Continue”).",
      program: "Press «Αλλαγή προγράμματος» (“Change program”) to say new exercises.",
      record:
        "Press «Έναρξη ηχογράφησης» (“Start recording”) and say the exercises out loud. No microphone: tap the sample «Γιώργος · αριστερό γόνατο». Then «Δημιουργία προγράμματος» (“Create program”).",
      toSample: "To the sample",
      review:
        "At the top the patient's program, further down the GeSY note in 4 parts. At the end pick a procedure code (e.g. PHYS02) and a bed, and press «Έγκριση» (“Approve”).",
      toNote: "The GeSY note",
      programPage:
        "Approved! Open the phone link below (or scan the QR), press «Χρειάζομαι τον φυσιοθεραπευτή» → «Πονάω», then come back to «Αίθουσα» (“Room”).",
      other: "Continue the tour from the room.",
      back: "Back to the tour",
      templates:
        "The clinic's templates. Open one to see its exercises. In «Νέα συνεδρία» (“New session”) you start from one and say only what changes.",
      dictate:
        "Tap the sample «Τρία πρότυπα» (“Three templates”), then «Δημιουργία προτύπων» (“Create templates”). Check the cards and save them.",
      recordTemplate: "Pick a template at the top, «Όπως είναι» (“As it is”), and say only what you did today.",
      diary: "The patient's home diary: what they did each day at home and how much it hurt. Pain 7 or more alerts you.",
    },
    notes: {
      pickPatient: "Tap George P.",
      continue: "Now «Συνέχεια» (“Continue”).",
      changeProgram: "«Αλλαγή προγράμματος» (“Change program”): you say the new exercises.",
      sample: "Tap a ready sample, or «Έναρξη ηχογράφησης» (“Start recording”) and say the exercises out loud.",
      record: "Press and say the exercises out loud, the way you tell the patient.",
      generate: "Press here. In about 15 seconds you have the note and the program.",
      code: "This is the GeSY note, in 4 parts, from your voice. Pick a procedure code, e.g. PHYS02.",
      bed: "Pick a bed: that's where the patient shows up in the room.",
      approve: "Press «Έγκριση» (“Approve”). Nothing reaches the patient before this.",
      phoneLink: "Open the patient's screen from here (or scan the QR with your phone).",
      needPhysio: "Now you are the patient. Press here…",
      pain: "…then «Πονάω» (“I'm in pain”).",
      backToRoom: "Sent! Go back to the room: their card turned red.",
      seen: "Press «Το είδα» (“Seen”): the patient's phone shows it at once.",
      toRoom: "To the room",
      show: "Show me",
      close: "Close the tour notes",
    },
    extrasTitle: "See these too",
    extrasNote: "optional",
    extras: {
      diary: { title: "Home diary", text: "Who did their exercises at home, and who was in pain." },
      templates: { title: "Templates", text: "Start a session from one of the clinic's templates and say only what changes." },
      dictate: {
        title: "Say your templates",
        text: "The programs you give often, said once, become templates. Uses 1 of the demo's 5 programs.",
      },
      print: { title: "Paper for the patient", text: "For a patient without a phone: the program on paper, with boxes for 2 weeks." },
    },
    extraOpen: "Open",
    extraSeen: "Seen",
    doneTitle: "That's PhysioPath",
    doneText:
      "The physio decides, PhysioPath writes. The clinic sees the whole room on one screen, and who exercises at home. Want the same for your own clinic?",
    stepDone: "Done",
    skip: "Skip",
    restart: "Start over",
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
