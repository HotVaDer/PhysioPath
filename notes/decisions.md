# Decision Log

Newest first. One entry per decision: what, why, what we'd need to see to change it.

## 2026-10-25 – Back to v0: the end of the session is the product

- **Decision:** The main product is v0 again: at the end of a one-to-one session the physio speaks for ~30 s and gets the clinical note and the patient's home program, both reviewed before use. Session mode (patient session screen, room board) is parked, not deleted, as a possible later option for GeSY group exercise (PHYS04), private group classes or sports rehab.
- **Why:** GeSY's normal physio sessions (PHYS01–03) must be one-to-one ("δεν εξυπηρετούνται παράλληλα άλλοι ασθενείς", allied-health rules Sep 2025), so a room board for parallel patients in those sessions shows what GeSY forbids. The only exception is PHYS04, supervised group exercise for 2–4 patients (45′), allowed only for neuro and scoliosis diagnoses: a niche, not the main market. Forums, blogs and a friend's feedback agree that physios see parallel care as a compromise, not something to optimise. GeSY requires a clinical note for every paid session (service given, assessment results, treatment plan, progress), which is v0's job. Dictating the home program at the end doubles as the explanation the physio already gives the patient.
- **Revisit if:** Interviews show GeSY notes take little time or are not a pain, or that parallel work (PHYS04 neuro groups, or outside GeSY) is common and accepted in the segment we pick.

## 2026-10-18 – Speech model back to turbo; program step stays at effort medium

- **Decision:** Whisper large-v3-turbo (not large-v3) with proofreading; Claude Opus 5.5 program step stays at effort medium.
- **Why:** `npm run bench:speech` on 5 phone-quality notes: turbo 96.1% words kept after proofreading in 2.1 s + 3.5 s per note, large-v3 95.2% in 6.0 s + 6.9 s. Proofreading removed large-v3's advantage. Effort low was ~5 s faster but guessed "3 sets" for an unclear "τρεις φορές" that medium left for the physio to answer. Wait to the first exercise ≈ 20 s.
- **Revisit if:** the same bench on real voices (drop recordings in `03-prototype/test-audio/`) shows large-v3 clearly ahead, or physios find ~20 s too slow at the start of a session.

## 2026-10-18 – New focus: the physio's assistant during the session

- **Decision:** PhysioPath is used at the **start** of the session. The physio speaks the day's plan; the patient follows it one exercise at a time on their phone (QR) or a clinic tablet (physio chooses); the physio watches a room board and gets "call the physio" requests. The home program and the clinical note become the end of the same session. All three segments (sports/calisthenics clinics, solo physios, multi-physio GeSY clinics) stay in scope until interviews pick one.
- **Why:** The physio is the paying customer. Waiting and interruptions during paid sessions cost them every day, a stronger reason to pay than unpaid paperwork alone. The founder lived it as a patient: his physio often ran 2–3 patients at once. The existing voice → program pipeline is reused.
- **Revisit if:** Interviews or observations show sessions are mostly one-to-one, physios won't dictate in front of patients, or patients won't use a screen mid-session.

## 2026-10-16 – Proofread the transcript with Claude Haiku before the physio sees it

- **Decision:** After Whisper, Claude Haiku 5.5 returns a list of word fixes, which the app applies with code checks (no number or left/right changes) and shows with undo. The physio only sees corrected text.
- **Why:** Whisper writes sounds and produces non-words; a physio seeing them would think the tool doesn't work. Haiku fixed all 5 errors in a real note for about 0.02 cents (vs ~3–6 cents for the program). A free local dictionary can't use context; folding it into the program call would make the physio wait 10–20 s to see any text.
- **Revisit if:** Physios report wrong fixes, or the physio vocabulary makes most fixes unnecessary.

## 2026-10-16 – Speech-to-text: add VAD, keep the turbo model

- **Decision:** Run Whisper large-v3-turbo with voice activity detection (VAD) and without carrying earlier text over. Keep turbo instead of the full large-v3. Improve browser recording (noise suppression, auto gain, 64 kbps, live level bar).
- **Why:** On noisy, phone-quality Greek test notes, the old setting silently dropped a whole sentence after a pause (a safety restriction). VAD raised words kept from 87.7% to 92.4% and was faster. large-v3 was 2.7x slower and not more accurate overall. Details: `03-prototype/docs/transcription.md`.
- **Revisit if:** Real recordings show large-v3 or a cloud service (EU-hosted) clearly ahead, or the physio vocabulary does not fix misheard English exercise names.

## 2026-10-15 – Build an interview demo before the full prototype

- **Decision:** Build a small demo (voice note → patient program + clinical note) to show at the end of interviews, while outreach continues. Fictional patients only.
- **Why:** No interviews yet; a 30-second demo gets sharper feedback than describing the idea, and it tests the biggest technical risk (Greek speech-to-text + faithful structuring) early.
- **Revisit if:** Interviews show physios don't want voice input, or need a different note format.

## 2026-10-15 – Demo stack: TypeScript, local Whisper, Claude Opus 5.5

- **Decision:** TypeScript on Node (no framework, no build step). whisper.cpp with large-v3-turbo running locally for speech-to-text. Claude Opus 5.5 with structured output for the writing step.
- **Why:** One language for server and page. Local transcription means patient audio never leaves the device, which helps the GDPR story, costs nothing and takes ~2–3 s for a 30 s note on an M4. Claude gives the best Greek quality, and structured output guarantees the fields the screen needs. The prompt forbids adding anything the physio didn't say.
- **Revisit if:** Transcription quality is poor on real Cypriot speech (try a cloud speech-to-text with EU hosting), or cost per note matters at scale (try a smaller Claude model on the sample notes).

## 2026-10-10 – Workspace created

- **Decision:** Follow the 5-step plan in the pitch (Listen → Observe → Prototype → Pilot → Launch). No code before the first interviews.
- **Why:** The biggest risks are whether physios feel this pain enough and how they want notes formatted, not the technology.
- **Revisit if:** Interviews show the main pain is something else.
