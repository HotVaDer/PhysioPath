# Interview Request: Email + Phone Script

Contacts: `contacts.csv` (local only). Fill in everything in [brackets] before sending.

Demo video (linked in every email): https://hotvader.github.io/PhysioPath/demo/ (English: add `?lang=en`)

The outreach app (`app/`) sends the wording in `app/templates.json`. Keep this file and that one in sync.

## How to send

- **One email per clinic, never CC.** Each one should feel personal: their name or clinic name in the greeting, and one line about them if you can (e.g. "I saw you work a lot with sports injuries").
- **Send from your university email** (@ucy.ac.cy). Physios are much more likely to reply to a student from UCY than to an unknown Gmail.
- **10–15 emails a day**, not 30 at once, so they don't land in spam.
- **Start with the emails checked on clinic websites** (`notes` column), then the directory ones.
- **Follow up once** after 5–7 days if there's no reply. Then stop.
- After sending, update `first_contact`, `status` and `next_step` in `contacts.csv`.

---

## Email: Greek (default)

**Θέμα:** Φοιτητής Πανεπιστημίου Κύπρου: θα θέλατε να δείτε ένα πρωτότυπο για φυσιοθεραπευτές;

> Καλησπέρα σας [κύριε/κυρία Επώνυμο | ομάδα του Όνομα Κέντρου],
>
> Ονομάζομαι Στυλιανός [Επώνυμο] και είμαι τεταρτοετής φοιτητής Πληροφορικής στο Πανεπιστήμιο Κύπρου.
>
> Πριν από λίγο καιρό χειρουργήθηκα για ρήξη δικεφάλου και πέρασα από φυσιοθεραπεία. Από εκεί ξεκίνησε η εργασία μου στο πλαίσιο του μαθήματος ΕΠΛ679 «Ηλεκτρονική Υγεία»: ένα πρωτότυπο που βοηθά τον φυσιοθεραπευτή με τις σημειώσεις και τις ασκήσεις για το σπίτι.
>
> Ο φυσιοθεραπευτής λέει τις ασκήσεις φωναχτά και η εφαρμογή γράφει την κλινική σημείωση και το πρόγραμμα του ασθενή. Σε μία οθόνη βλέπετε ποιος ασκείται, ποιος έχει απορία και ποιος πονάει, κάτι που βοηθά κυρίως όταν στο κέντρο δουλεύουν αρκετοί φυσιοθεραπευτές ή βοηθοί.
>
> Έφτιαξα μια σελίδα με ένα βίντεο 1,5 λεπτού και, ακριβώς από κάτω, ένα σύντομο ερωτηματολόγιο (οι ασθενείς στο βίντεο είναι φανταστικοί):
> https://hotvader.github.io/PhysioPath/demo/
>
> Θα σας παρακαλούσα να δείτε το βίντεο και να μου πείτε τη γνώμη σας στο ερωτηματολόγιο. Παίρνει περίπου 2 λεπτά, και στο τέλος μπορείτε, αν θέλετε, να κανονίσουμε μια σύντομη συνάντηση. Δεν πουλάω κάτι. Η ειλικρινής γνώμη σας, θετική ή αρνητική, θα με βοηθούσε πολύ.
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

**Subject:** University of Cyprus student: would you take a look at a prototype for physiotherapists?

> Dear [Name | Clinic team],
>
> My name is Stylianos [Surname], and I'm a 4th-year Computer Science student at the University of Cyprus.
>
> I recently had surgery for a torn bicep and went through physiotherapy. That led to my project for my EPL679 (eHealth) course: a prototype that helps physiotherapists with clinical notes and home exercises.
>
> The physiotherapist says the exercises out loud, and the app writes the clinical note and the patient's program. One screen shows who is exercising, who has a question and who is in pain, which helps most when a clinic has several physiotherapists or assistants.
>
> I made a page with a 1.5-minute video and, right below it, a short questionnaire (the patients in the video are fictional; the video is in Greek):
> https://hotvader.github.io/PhysioPath/demo/?lang=en
>
> I'd be grateful if you could watch the video and share your opinion in the questionnaire. It takes about 2 minutes, and at the end you can also set up a short meeting if you'd like. I'm not selling anything. Your honest opinion, good or bad, would help me a lot.
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

> Καλησπέρα σας ξανά. Ήθελα απλώς να επανέλθω στο προηγούμενο μήνυμά μου. Αν έχετε 2 λεπτά, θα με βοηθούσε πάρα πολύ να δείτε το βίντεο και να συμπληρώσετε το σύντομο ερωτηματολόγιο από κάτω: https://hotvader.github.io/PhysioPath/demo/ Αν δεν σας ενδιαφέρει, κανένα πρόβλημα, ενημερώστε με και δεν θα σας ξαναενοχλήσω.
>
> Ευχαριστώ,
> Στυλιανός

**English:**

> Hi again, just following up on my previous message. If you have 2 minutes, it would help me a lot if you could watch the video and fill in the short questionnaire below it: https://hotvader.github.io/PhysioPath/demo/?lang=en If it's not a good fit, no problem at all, just let me know and I won't contact you again.
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
**If "send me an email":** get the address and send the Greek email above the same day (it includes the demo video).
**If no:** "Κανένα πρόβλημα, ευχαριστώ πολύ για τον χρόνο σας." Mark it in `contacts.csv` and move on.
