# Speech-to-text: settings and how they were chosen

Whisper runs with **large-v3-turbo + VAD + `-mc 0`** (`app/lib/transcribe.ts`). Without VAD it sometimes skipped a whole sentence after a pause, silently.

## Test (2026-10-16)

- **Audio:** 4 Greek notes (samples 02–04 and one unseen note) read by the macOS Greek voice "Melina", with 1.6 s pauses, degraded to sound like a cheap phone (300–3400 Hz, background noise, Opus 24 kbps).
- **Score:** "words kept" = share of the original words found in the transcript; WER = words added, missed or changed. Numbers count the same written as words or digits.

| Setting | Words kept, 02–04 | WER, 02–04 | WER, unseen note | Time, 4 notes |
|---|---|---|---|---|
| turbo (before) | 87.7% (note 03: 73.8%) | 12.8% | 10.3% | 11.1 s |
| **turbo + VAD** | **92.4%** | **9.1%** | 10.3% | **8.5 s** |
| large-v3 | 84.5% | 16.0% | 5.1% | 23.8 s |
| large-v3 + VAD | 88.6% | 12.4% | 7.7% | 22.9 s |

- **In the real app:** headless Chrome, with the page's microphone replaced by the same recordings. Every note kept ≥ 90% and was transcribed in 2–3 s. The quiet-mic warning appeared after 3 s of silence and never fired during speech.
- **What was dropped before:** in note 03, "Να μη σηκώνει τίποτα βαρύτερο από ένα ποτήρι νερό με το δεξί χέρι", a safety restriction.

## Limits

- The voice is synthetic and pronounces English terms badly; English exercise names (pendulum, wall slides, isometric) are still often misheard.
- 4 notes is a small sample, and no real phones were used. Re-run with real recordings before changing models.

## Recording (browser side)

`app/hooks/useRecorder.ts` asks for noise suppression, echo cancellation, automatic gain and mono, and records Opus at 64 kbps. A level bar shows while recording, and "Δεν σας ακούω καλά…" appears after 3 s without speech.

## Proofreading (2026-10-16)

Whisper writes sounds, so it sometimes produces words that don't exist ("εχείρηση") or English terms spelled by sound ("Front Level Rose"). Right after Whisper, `app/lib/proofread.ts` sends the text (never audio) to **Claude Haiku 5.5** (effort low), which returns only a list of word fixes. `app/lib/fixes.ts` applies them with hard checks: a fix that changes a number or swaps left/right is refused. Any failure returns Whisper's text unchanged. The Record page shows the corrected text with "Διορθώθηκαν N λέξεις" and an Αναίρεση per fix.

- **On a real Whisper transcript** (the founder's own note), all 5 errors were fixed in 1.7 s: εχείρηση → εγχείρηση, διεξήν του ώμου → δεξιού ώμου, front level raises → front lever raises, Front Level Rose → front lever rows, 3 asset → 3 sets.
- **On sample 03:** όμως → ώμος, τείχο → τοίχο, Τινγιουλεν → Pendulum, γουολ σλάιμπς → wall slides. Already-correct text gets no fixes.
- **Cost / time:** 0.02–0.05 cents and 2–5 s per note.
- **Tried and rejected:** thinking off (faster, but turned "Αισυμέτρικ" into "Asymmetric" instead of isometric).
- **English terms rule (2026-10-17):** a dedicated rule with examples (αισομέτρικ → isometric, not ισομετρική) plus "fix misheard English already in Latin letters". In 2 runs each: every English term came out in English, including ones not in the examples (lunges, Romanian deadlift, plank, foam roller); real Greek words (ισομετρική άσκηση, βαθύ κάθισμα) were left alone. Note: "αισομέτρικ" is now one of the prompt's own examples, so sample 03 no longer tests it independently.
- **Known gaps:** results vary a little between runs; a misheard number word ("οπτό" for οκτώ) is left alone on purpose (numbers are never changed), so Claude's questions to the physio have to catch it.
- **Meaning check (2026-10-17):** the proofreader now first works out what the note is about, then flags real Greek words that don't fit their sentence ("έχει χειρίσει δεξιός όμως" → "έχει εγχείριση, δεξιός ώμος"), and runs at effort medium instead of low. On 6 test notes × 2 runs (real-but-wrong words not used in the prompt: διατάξεις → διατάσεις, αγώνα → αγκώνα, πόδια → πόνο, plus 2 correct notes): old prompt at low 8/12, new prompt at medium 12/12 in meaning (one grammar form off), no false fixes, ~2 s. Low effort once changed "αγώνα" into "γόνατα" (a different body part); the code checks only block number and left/right changes, so body-part changes rely on the prompt.

## Speed check for session mode (2026-10-18)

`npm run bench:speech` (`scripts/speech-bench.ts`) runs the app's own `transcribe()` + `proofread()` for every model in `models/` on every note in `test-audio/` (audio + `.txt` with the exact words; synthetic notes are made if empty). `-- --generate` also times the program step at effort medium vs low.

| Model | Words kept: Whisper → after proofreading | WER after | Seconds per note |
|---|---|---|---|
| **large-v3-turbo** (chosen) | 92.7% → **96.1%** | 4.8% | 2.1 + 3.5 |
| large-v3 | 91.6% → 95.2% | 5.4% | 6.0 + 6.9 |

Program step (Opus 5.5): medium 9.5–18.8 s, low 6.6–10.2 s. Low changed the exercises in 3 of 5 notes, once guessing "3 sets" for an unclear "τρεις φορές", so the app stays on medium. Total wait to the first exercise ≈ 20 s.
