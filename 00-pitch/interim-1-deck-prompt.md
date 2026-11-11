# Prompt: recreate the Interim 1 deck with the new focus

Paste everything below the line into a new Claude chat and attach two files:
- `~/Downloads/EPL 679 Interim 1 – Physio App.pdf` (the current deck)
- `00-pitch/pitch.md` (the updated idea)

---

You're helping a three-person student team (University of Cyprus, course EPL 679 Mobile App Development) update their slides for **Interim Presentation 1 on 22 October 2026**. The talk is **3–5 minutes**. The course asks it to cover the introduction, the methodology and the resources required.

I've attached the current deck (`EPL 679 Interim 1 – Physio App.pdf`, 9 slides) and our updated pitch (`pitch.md`). The product idea changed after the deck was made. Recreate the deck for the new idea. Keep the same 9 slides, the same order and the same look, and update the content.

## Keep the look

- **Match the attached PDF:**
  - a dark green title slide;
  - serif slide titles, with a small orange uppercase label above each one ("THE PROBLEM", "ARCHITECTURE");
  - cream cards with thin borders;
  - the footer "PhysioPath · EPL 679 · N";
  - 16:9.
- **One message per slide.** The title is that message, written as a sentence.
- **Little text.** Each slide gets about 30 seconds.

## What changed in the idea

**Before:** PhysioPath was used at the *end* of a session. The physio dictated a voice note, and AI turned it into a home exercise program for the patient's phone.

**Now:** PhysioPath is the physiotherapist's assistant *during* the session, used at the start of it. The physio is the paying customer.

1. **The physio speaks today's exercises in Greek,** for about 30 seconds, mixing in English exercise names as physios do ("wall slides 3×10").
2. **AI turns this into a structured list** of exercises, sets, reps and holds. The physio checks it and taps "Start session". Nothing reaches the patient without the physio's review.
3. **The patient follows the exercises one at a time.** They use their own phone (scan a QR code, no app download) or a clinic tablet at the station; the physio chooses which for each patient.
   - A big "Τελείωσα το σετ" (I finished the set) button. The next exercise appears by itself.
   - A countdown when the exercise has a hold.
   - "Χρειάζομαι τον φυσιοθεραπευτή" (I need the physio), with "Απορία" (question) or "Πόνος" (pain).
4. **The physio watches a live room board.** It shows every patient's progress, who has finished, and who needs the physio and since when.
5. **At the end, one tap** turns the session into the patient's home program and a clinical note.

**Why:** physios often work with 2–3 patients at once. A patient finishes a set and then waits, or calls the physio over. The physio keeps walking back to give the next instruction, and paid minutes are lost on both sides. The founder lived this during his own rehab after biceps surgery. The paperwork, which was the old focus, now comes for free from the session.

**Who it's for.** All three groups stay in until interviews pick one:
- sports and calisthenics clinics;
- solo physiotherapists;
- clinics with several physios inside GeSY, Cyprus's public health system.

**Safety rule, which must appear in the deck:** PhysioPath is a documentation and organisation tool, not a medical one. The AI only records what the physio said. It never diagnoses, suggests treatment or advises patients. The call button only notifies the physio.

**What we already have:**
- **A working demo for interviews, with fictional patients only:** a web app that goes voice → physio checks the program → patient screen via QR on the same Wi-Fi → room board → home program and clinical note.
- **Speech-to-text tests on synthetic, phone-quality Greek notes:**
  - about 96% of words come out right after an AI proofreading step;
  - about 20 seconds from speaking to the first exercise on screen.
- **No interviews with physiotherapists yet.**

## Slide by slide

1. **Title.**
   - Write a new subtitle for the in-session idea, one line if possible. The idea to get across: the physio speaks the plan, patients follow it on a screen, and the physio sees the whole room.
   - Keep the names and the date: Stylianos Kyriakou · Orestis Sarris · Giorgos Papapetrou · 22 October 2026.
2. **The problem.** The message: during the session, the physio is the bottleneck. Keep the two cards:
   - **For the patient:** waits for the next instruction, forgets sets and reps, feels left alone.
   - **For the physiotherapist:** 2–3 patients at once and constant interruptions, then unpaid paperwork afterwards.
3. **Our solution.** Keep the row of 4 numbered steps and the title "The physio decides, the AI writes". The new steps:
   1. Speak the plan.
   2. The physio checks it.
   3. The patient follows on a screen.
   4. Room board, and one tap at the end for the home program and note.
4. **Who it is for.** Three personas, adapted:
   - **Marina, 38,** physiotherapist with a small clinic in Limassol. She often has 2–3 patients at once and wants fewer interruptions.
   - **Nikos, 29,** recovering from knee surgery and back to calisthenics. He has many exercises per session and wants to know what's next without waiting.
   - **Eleni, 68,** hip replacement, with an older Android phone. She uses the clinic tablet with large text.
5. **Main functionalities.** Five epics, as a table:

   | Epic | What the user can do | Priority |
   |---|---|---|
   | E1 Onboarding & consent | Choose a role, read the data notice, give consent | Must |
   | E2 Session builder | The physio creates today's session by voice (AI) or by typing, checks it and starts it | Must |
   | E3 Patient session screen | One exercise at a time on a phone (QR) or a clinic tablet: mark sets done, hold timer, call the physio | Must |
   | E4 Room board | The physio sees every patient's progress and calls, live | Must |
   | E5 End of session & sync | Home program and clinical note, login, offline use, FHIR export | Should / Could |

   Keep the line: "Voice is built on top of manual entry, so the app still works if the AI fails."
6. **Architecture.** Keep the three blocks (Phone · Backend in the EU · Cloud AI) and update them:
   - **Phone, React Native (Expo) app.** Three views:
     - the physio's view (build a session, room board);
     - the patient's session screen;
     - clinic-tablet mode.

     A patient who scans the QR code can also open the session as a web page without installing anything.
   - **Backend, Supabase in the EU.** Add live sync (Supabase Realtime), so a tap on the patient's phone shows on the room board within seconds.
   - **Cloud AI.** Greek speech-to-text, then a proofreading step, then an LLM that writes the structured session.
   - **Footer:** keep "Data exported as FHIR: CarePlan, Observation, QuestionnaireResponse".
7. **Methodology.** Keep it as it is: Scrum with one-week sprints, the team roles (Orestis Sarris: Product Owner / Scrum Master; Stylianos Kyriakou: UI Designer / Frontend; Giorgos Papapetrou: Full Stack Developer) and the tools (Trello, GitHub, Teams, Figma). Add one short line: we check the idea with physiotherapist interviews and by watching real sessions (with patient permission), counting waits and interruptions.
8. **Resources required.** Keep the four boxes and update them:
   - **Software & tools:** as before, plus Supabase Realtime.
   - **AI & cloud:** as before.
   - **People:**
     - 2–3 physiotherapists in Limassol, ideally ones who see several patients at once;
     - permission to sit in on a few sessions;
     - student test users.
   - **Devices:**
     - the Android emulator;
     - at least two physical Android phones, one of them older;
     - one tablet for clinic-tablet mode.
9. **Roadmap.** Four steps:
   - **Sprint 0 · now:** inception (personas, wireframes, architecture, repository, backlog) and the interview demo.
   - **12 Nov · Interim 2, core flow:** the physio builds a session by hand, the patient follows it on a phone, and the room board updates live.
   - **3 Dec · Final, full demo:** voice-to-session AI, "call the physio", and the home program and clinical note at the end.
   - **23 Dec · Delivery:** APK, report, demo video, GitHub repository.

   Closing line: "Next step: interview physiotherapists, starting with how sessions run with several patients at once. Thank you, questions?"

## Rules

- **Don't invent anything.** No numbers, market data, quotes or results beyond what's above. Use only the two test numbers (about 96%, about 20 s), and say they come from synthetic test notes.
- **No claims from physios.** No interviews have happened yet, so never write "physios told us" or anything like it.
- **Language:** slide text in English. Greek only for the patient-screen button labels, with the English in brackets the first time.
- **Fictional patients only.**
- **Plain words and short sentences.** No buzzwords ("revolutionary", "seamless", "leverage").

## What to give me

1. **The deck,** in the same style as the attached one, ready to present and export to PDF or PowerPoint.
2. **Speaker notes for each slide,** written to be spoken: about 30 seconds each, under 4.5 minutes for the whole talk. Start each slide's notes with a [Presenter] placeholder; we'll decide who says what.
3. **A short list of what changed** from the old deck, slide by slide.
