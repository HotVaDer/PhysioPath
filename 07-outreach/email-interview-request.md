# Interview Request: Email + Phone Script

Contacts: `contacts.csv` (local only). Fill in everything in [brackets] before sending.

## How to send

- **One email per clinic, never CC.** Each one should feel personal: their name or clinic name in the greeting, and one line about them if you can (e.g. "I saw you work a lot with sports injuries").
- **Send from your university email** (@ucy.ac.cy). Physios are much more likely to reply to a student from UCY than to an unknown Gmail.
- **10–15 emails a day**, not 30 at once, so they don't land in spam.
- **Start with the emails checked on clinic websites** (`notes` column), then the directory ones.
- **Follow up once** after 5–7 days if there's no reply. Then stop.
- After sending, update `first_contact`, `status` and `next_step` in `contacts.csv`.

---

## Email: Greek (default)

**Θέμα:** Φοιτητής Πανεπιστημίου Κύπρου: 20 λεπτά για την εμπειρία σας ως φυσιοθεραπευτής;

> Καλησπέρα σας [κύριε/κυρία Επώνυμο | ομάδα του Όνομα Κέντρου],
>
> Ονομάζομαι Στυλιανός [Επώνυμο] και είμαι τεταρτοετής φοιτητής Πληροφορικής στο Πανεπιστήμιο Κύπρου.
>
> Πριν από λίγο καιρό χειρουργήθηκα για ρήξη δικεφάλου και πέρασα από φυσιοθεραπεία. Τότε κατάλαβα πόσα πράγματα πρέπει να θυμάται ο ασθενής ανάμεσα στις συνεδρίες, αλλά και πόσος χρόνος χρειάζεται από τον φυσιοθεραπευτή για σημειώσεις και οδηγίες.
>
> Στο πλαίσιο του μαθήματος [ΕΠΛ679 – όνομα μαθήματος] κάνω μια μικρή έρευνα για το πώς δουλεύουν σήμερα οι φυσιοθεραπευτές με:
> - τις σημειώσεις μετά από κάθε συνεδρία, και
> - τις ασκήσεις που δίνουν στους ασθενείς για το σπίτι.
>
> Δεν πουλάω κάτι. Θα ήθελα μόνο να ακούσω την εμπειρία σας. Θα μπορούσατε να μου διαθέσετε περίπου 20 λεπτά, στον χώρο σας, τηλεφωνικά ή μέσω βιντεοκλήσης, όποτε σας βολεύει;
>
> Ό,τι μου πείτε θα χρησιμοποιηθεί μόνο για την έρευνα, χωρίς να αναφερθεί το όνομά σας ή το όνομα του κέντρου.
>
> Σας ευχαριστώ πολύ για τον χρόνο σας.
>
> Με εκτίμηση,
> Στυλιανός [Επώνυμο]
> Τμήμα Πληροφορικής, Πανεπιστήμιο Κύπρου
> [κινητό] · [email]

---

## Email: English (for English-speaking clinics)

Use for contacts marked "English" in `contacts.csv`, or clinics whose website is English-only.

**Subject:** University of Cyprus student: 20 minutes about your work as a physiotherapist?

> Dear [Name | Clinic team],
>
> My name is Stylianos [Surname], and I'm a 4th-year Computer Science student at the University of Cyprus.
>
> I recently had surgery for a torn bicep and went through physiotherapy. It showed me how much a patient has to remember between sessions, and how much time physiotherapists spend on notes and instructions.
>
> As part of my [EPL679 – course name] course, I'm researching how physiotherapists currently handle:
> - clinical notes after each session, and
> - home exercises for their patients.
>
> I'm not selling anything. I'd just like to hear about your experience. Could you spare about 20 minutes, at your clinic, by phone or on a video call, whenever suits you?
>
> Anything you share will be used only for this research, without naming you or your clinic.
>
> Thank you very much for your time.
>
> Kind regards,
> Stylianos [Surname]
> Department of Computer Science, University of Cyprus
> [mobile] · [email]

---

## Follow-up (5–7 days later, reply in the same thread)

**Greek:**

> Καλησπέρα σας ξανά. Ήθελα απλώς να επανέλθω στο προηγούμενο μήνυμά μου. Ακόμη και 15 λεπτά τηλεφωνικά θα με βοηθούσαν πάρα πολύ. Αν δεν σας ενδιαφέρει, κανένα πρόβλημα, ενημερώστε με και δεν θα σας ξαναενοχλήσω.
>
> Ευχαριστώ,
> Στυλιανός

**English:**

> Hi again, just following up on my previous message. Even 15 minutes by phone would help me a lot. If it's not a good fit, no problem at all, just let me know and I won't contact you again.
>
> Thanks,
> Stylianos

---

## Phone script (Greek)

For contacts with a phone number only. Call mid-morning or early afternoon, not at the start or end of the day. If a receptionist answers, ask when the physio is free, or ask for an email to send the details to.

> Καλημέρα σας, λέγομαι Στυλιανός, είμαι φοιτητής στο Πανεπιστήμιο Κύπρου. Μπορώ να σας απασχολήσω ένα λεπτό;
>
> Κάνω μια έρευνα για το πώς δουλεύουν οι φυσιοθεραπευτές με τις σημειώσεις και τις ασκήσεις για το σπίτι. Ξεκίνησε επειδή πέρασα κι εγώ από φυσιοθεραπεία μετά από χειρουργείο στον δικέφαλο.
>
> Δεν πουλάω κάτι. Θα μπορούσα να σας κλέψω 20 λεπτά κάποια μέρα που σας βολεύει, να μου πείτε πώς το κάνετε εσείς;

**If yes:** book date, time and place (clinic, phone or video). Get their email or mobile and send a confirmation message.
**If "send me an email":** get the address and send the Greek email above the same day.
**If no:** "Κανένα πρόβλημα, ευχαριστώ πολύ για τον χρόνο σας." Mark it in `contacts.csv` and move on.
