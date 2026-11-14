# Speech-to-text: settings and how they were chosen

## Cloud engines (2026-11-14)

The app is going online, and a web server can't run whisper.cpp, so the audio now goes to a cloud speech-to-text service. Three engines are built in (`app/lib/transcribe.ts`), picked with `SPEECH` in `.env`:

| `SPEECH=` | Engine | Where the audio goes | File |
|---|---|---|---|
| `openai` (**chosen**) | OpenAI `gpt-transcribe` + Cypriot hint | OpenAI (US) | `app/lib/speech/openai.ts` |
| `azure` | Azure AI Speech, fast transcription, `el-GR` | Microsoft, France Central (EU) | `app/lib/speech/azure.ts` |
| `local` (default if unset) | whisper.cpp large-v3-turbo + VAD | Stays on this Mac | `app/lib/speech/whisper.ts` |

Proofreading (Claude Haiku) and the program step (Claude Opus) run after every engine, unchanged. The Record page tells the physio where the audio goes for the engine in use.

### Why OpenAI

Physios in Cyprus speak Cypriot dialect, not standard Greek, and the engine has to keep **numbers** (doses) and **negations** («όι» = no) exactly.

**Real Cypriot voice (the founder, 1 note, shoulder script, read freely with heavy dialect: σέριν, κελλέν, endings in -ν):**

| Said | Azure | OpenAI |
|---|---|---|
| Μπάσκετ ακόμα **όι** | μπάσκετ ακόμα **και** (meaning flipped) | **όι** ✓ |
| Αν **πρηστεί** | αν **βριστεί** (swelling warning lost) | **πρηστεί** ✓ |
| **δκυο** σετ των δέκα | «σκιώσε το 10» (dose lost) | **2 σετ των 10** ✓ |
| **τριάντα** δευτερόλεπτα | «δεν δεύτερο ή τα» | **30 δευτερόλεπτα** ✓ |
| σέριν, κελλέν | – | σέριν, κελλέν ✓ |
| μάλαξη | – | «αλλαγές» ✗ (since added to the hint) |

**Benchmark (`npm run bench:speech`, 6 notes: 5 standard Greek + 1 Cypriot, all the macOS voice "Melina" degraded to phone quality):**

| Engine | Words kept, after proofreading | Numbers kept | WER | Cypriot note: words / numbers | Seconds per note (speech + proofreading) |
|---|---|---|---|---|---|
| **OpenAI gpt-transcribe** | **97.8%** | **100%** | **2.5%** | **98.4% / 100%** | 2.4 + 2.5 |
| Whisper large-v3-turbo (local) | 94.7% | 100% | 6.1% | 86.2% / 100% | 2.5 + 4.6 |
| Azure el-GR | 92.9% | 98.1% | 7.6% | 86.2% / 88.9% | 1.2 + 3.9 |
| Whisper large-v3 (local) | 88.1% | 92.6% | 12.4% | 52.8% / 55.6% | 5.8 + 4.0 |

OpenAI also needs the fewest proofreading fixes, so the whole step is the fastest end to end. Azure is the fastest engine on its own but drops dialect words and numbers. A wrong or missing dose is the worst error for this tool, so OpenAI is the default for the online app.

**Model choice inside OpenAI** (same Cypriot note, with and without the hint): `gpt-transcribe` + hint was almost word for word and kept the Cypriot spelling. Without the hint it wrote «όχι» for «όι» and «όμως» for «ώμος». `gpt-4o-transcribe` garbled one phrase («μ' αλλάξει στο νόμο»); `gpt-4o-mini-transcribe` wrote «οι» for «όι».

### The hint

`openai.ts` sends a short `prompt`: "Cypriot dialect physio notes", common dialect words with their standard form (όι = όχι, δκυο = δύο, τζιαι = και, σέριν = χέρι…), treatment words (μάλαξη, κινητοποίηση…) and English exercise names. It only steers spelling; it can't add words that weren't said. Azure's fast transcription accepts a phrase list (API 2025-10-15) but it made no difference in a test, and it has no way to describe a dialect.

### How the benchmark scores (changes on 2026-11-14)

- **Numbers kept:** share of the spoken numbers (sets, reps, seconds, ages) found in the transcript. "Words kept" can look fine while a 15 became a 10, so this is the measure that matters most.
- **Dialect spellings** that some engines keep and others standardise (τζιαι/τζαι/τζιε → και, δκυο → 2, μεν → μην) are mapped on both sides, so no engine is penalised for spelling. «όι» is not mapped: without accents it is the same as the article «οι».
- **Compound numbers:** «τριάντα δύο» counts as 32, as engines write it in digits.
- `npm run bench:speech -- --engines=openai,azure,local` picks engines; cloud engines run only when their key is in `.env`. One engine failing doesn't stop the others.

### Privacy

The **text** of every note already went to the Claude API; sending the **audio** to a cloud engine is the same kind of step. Still **fictional patients only** until `06-privacy-legal/checklist.md` is done. For real patients: OpenAI processes the audio in the US (needs a data processing agreement and a transfer basis under GDPR); Azure can stay in the EU (France Central); Whisper never leaves the Mac. Keys live only in `.env` (gitignored) and, once deployed, in the host's secret settings.

### Setup and cost

- `OPENAI_API_KEY` from platform.openai.com (prepaid credit, auto-recharge off). Well under a cent per note.
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=francecentral` from portal.azure.com (Azure for Students; Speech resource on the free F0 tier, 5 audio hours a month). Student subscriptions may only deploy to a fixed list of regions; this one allowed polandcentral, francecentral, austriaeast, germanywestcentral and uaenorth.
- After changing `SPEECH`, restart `npm run dev`.

### Limits

- The benchmark voice is synthetic; only one real Cypriot recording so far. Next: the founder's recordings `test-audio/cy-01` to `cy-04` (scripts already there), then other people's voices.
- Few notes; results vary a little between runs.
- No engine is perfect («μάλαξη» → «αλλαγές»), so the physio's review step stays essential. Idea: highlight every number on the review page so doses are checked at a glance.

---

## Whisper (local), October 2026

Whisper runs with **large-v3-turbo + VAD + `-mc 0`** (`app/lib/transcribe.ts`). Without VAD it sometimes skipped a whole sentence after a pause, silently.

### Test (2026-10-16)

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

### Limits

- The voice is synthetic and pronounces English terms badly; English exercise names (pendulum, wall slides, isometric) are still often misheard.
- 4 notes is a small sample, and no real phones were used. Re-run with real recordings before changing models.

### Recording (browser side)

`app/hooks/useRecorder.ts` asks for noise suppression, echo cancellation, automatic gain and mono, and records Opus at 64 kbps. A level bar shows while recording, and "Δεν σας ακούω καλά…" appears after 3 s without speech.

### Proofreading (2026-10-16)

Whisper writes sounds, so it sometimes produces words that don't exist ("εχείρηση") or English terms spelled by sound ("Front Level Rose"). Right after Whisper, `app/lib/proofread.ts` sends the text (never audio) to **Claude Haiku 5.5** (effort low), which returns only a list of word fixes. `app/lib/fixes.ts` applies them with hard checks: a fix that changes a number or swaps left/right is refused. Any failure returns Whisper's text unchanged. The Record page shows the corrected text with "Διορθώθηκαν N λέξεις" and an Αναίρεση per fix.

- **On a real Whisper transcript** (the founder's own note), all 5 errors were fixed in 1.7 s: εχείρηση → εγχείρηση, διεξήν του ώμου → δεξιού ώμου, front level raises → front lever raises, Front Level Rose → front lever rows, 3 asset → 3 sets.
- **On sample 03:** όμως → ώμος, τείχο → τοίχο, Τινγιουλεν → Pendulum, γουολ σλάιμπς → wall slides. Already-correct text gets no fixes.
- **Cost / time:** 0.02–0.05 cents and 2–5 s per note.
- **Tried and rejected:** thinking off (faster, but turned "Αισυμέτρικ" into "Asymmetric" instead of isometric).
- **English terms rule (2026-10-17):** a dedicated rule with examples (αισομέτρικ → isometric, not ισομετρική) plus "fix misheard English already in Latin letters". In 2 runs each: every English term came out in English, including ones not in the examples (lunges, Romanian deadlift, plank, foam roller); real Greek words (ισομετρική άσκηση, βαθύ κάθισμα) were left alone. Note: "αισομέτρικ" is now one of the prompt's own examples, so sample 03 no longer tests it independently.
- **Known gaps:** results vary a little between runs; a misheard number word ("οπτό" for οκτώ) is left alone on purpose (numbers are never changed), so Claude's questions to the physio have to catch it.
- **Meaning check (2026-10-17):** the proofreader now first works out what the note is about, then flags real Greek words that don't fit their sentence ("έχει χειρίσει δεξιός όμως" → "έχει εγχείριση, δεξιός ώμος"), and runs at effort medium instead of low. On 6 test notes × 2 runs (real-but-wrong words not used in the prompt: διατάξεις → διατάσεις, αγώνα → αγκώνα, πόδια → πόνο, plus 2 correct notes): old prompt at low 8/12, new prompt at medium 12/12 in meaning (one grammar form off), no false fixes, ~2 s. Low effort once changed "αγώνα" into "γόνατα" (a different body part); the code checks only block number and left/right changes, so body-part changes rely on the prompt.

### Speed check for session mode (2026-10-18)

`npm run bench:speech` (`scripts/speech-bench.ts`) runs the app's own `transcribe()` + `proofread()` for every model in `models/` on every note in `test-audio/` (audio + `.txt` with the exact words; synthetic notes are made if empty). `-- --generate` also times the program step at effort medium vs low.

| Model | Words kept: Whisper → after proofreading | WER after | Seconds per note |
|---|---|---|---|
| **large-v3-turbo** (chosen) | 92.7% → **96.1%** | 4.8% | 2.1 + 3.5 |
| large-v3 | 91.6% → 95.2% | 5.4% | 6.0 + 6.9 |

Program step (Opus 5.5): medium 9.5–18.8 s, low 6.6–10.2 s. Low changed the exercises in 3 of 5 notes, once guessing "3 sets" for an unclear "τρεις φορές", so the app stays on medium. Total wait to the first exercise ≈ 20 s.
