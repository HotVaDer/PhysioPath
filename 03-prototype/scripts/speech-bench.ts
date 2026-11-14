// Speech-to-text bench: how many of the spoken words (and numbers) survive, per engine, before and after
// proofreading, and how long each step takes. Runs the app's own transcribe() and proofread().
// Engines: Whisper (each model in models/), OpenAI and Azure (only when their key is in .env).
//
//   npm run bench:speech                            every engine available, every note in test-audio/
//   npm run bench:speech -- --engines=openai,azure  only these (local, openai, azure)
//   npm run bench:speech -- --generate              also time the program step (Claude) at effort medium vs low
//
// test-audio/ holds pairs: <name>.<m4a|webm|wav|mp3|…> + <name>.txt with the exact words spoken.
// It is gitignored (voices are personal data). When it has no audio yet, synthetic phone-quality
// notes are made with the macOS Greek voice (files named synth-…), so drop your own recordings next to them.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AUDIO_DIR = path.join(ROOT, "test-audio");
const MODELS_DIR = path.join(ROOT, "models");
const AUDIO_EXT = /\.(m4a|webm|wav|mp3|ogg|aac|mp4|aiff)$/i;

type Note = { name: string; audio: string; text: string };
type NoteResult = { name: string; speechSeconds: number; proofreadSeconds: number; heard: Score; checked: Score; fixes: number; text: string };
type Score = { kept: number; wer: number; numbers: number };

// ---- scoring: share of the spoken words found in the transcript, and word error rate ----
const NUMBER_WORDS: Record<string, string> = {
  ενα: "1", μια: "1", δυο: "2", τρια: "3", τρεισ: "3", τεσσερα: "4", τεσσερισ: "4", πεντε: "5", εξι: "6", επτα: "7", εφτα: "7",
  οκτω: "8", οχτω: "8", εννια: "9", εννεα: "9", δεκα: "10", δωδεκα: "12", δεκαπεντε: "15", εικοσι: "20", τριαντα: "30", σαραντα: "40",
  πενηντα: "50", εξηντα: "60", εβδομηντα: "70", ογδοντα: "80", ενενηντα: "90",
  δκυο: "2", // Cypriot
};
// Cypriot spellings some engines keep and others turn into standard Greek. Mapped on both sides so neither
// is penalised for the spelling. Only unambiguous words: «όι» is left out because without accents it is «οι».
const DIALECT: Record<string, string> = { τζιαι: "και", τζαι: "και", τζιε: "και", μεν: "μην" };
const words = (text: string) =>
  joinTensAndUnits(
    text
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/ς/g, "σ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => NUMBER_WORDS[w] ?? DIALECT[w] ?? w),
  );

// «τριάντα δύο» is one number (32), the way engines write it as digits.
function joinTensAndUnits(list: string[]) {
  const out: string[] = [];
  for (const w of list) {
    const last = out.at(-1);
    if (last && /^[2-9]0$/.test(last) && /^[1-9]$/.test(w)) out[out.length - 1] = String(Number(last) + Number(w));
    else out.push(w);
  }
  return out;
}

function editDistance(a: string[], b: string[]) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row.push(Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    previous = row;
  }
  return previous[b.length];
}

function score(reference: string, hypothesis: string): Score {
  const ref = words(reference);
  const hyp = words(hypothesis);
  const pool = new Map<string, number>();
  for (const w of hyp) pool.set(w, (pool.get(w) ?? 0) + 1);
  let found = 0;
  for (const w of ref) {
    const left = pool.get(w) ?? 0;
    if (left > 0) {
      found++;
      pool.set(w, left - 1);
    }
  }
  return { kept: found / ref.length, wer: editDistance(ref, hyp) / ref.length, numbers: numbersKept(ref, hyp) };
}

// Share of the spoken numbers (sets, reps, seconds, ages…) that appear in the transcript. "Words kept" can look
// fine while a 15 became a 10, so this is the measure that matters most for doses.
function numbersKept(ref: string[], hyp: string[]) {
  const spoken = ref.filter((w) => /^\d+$/.test(w));
  const pool = hyp.filter((w) => /^\d+$/.test(w));
  let found = 0;
  for (const n of spoken) {
    const i = pool.indexOf(n);
    if (i >= 0) {
      found++;
      pool.splice(i, 1);
    }
  }
  return spoken.length ? found / spoken.length : 1;
}

// ---- test notes ----
const SYNTHETIC: Record<string, string> = {
  "synth-ankle":
    "Νίκος, αριστερή ποδοκνημική, διάστρεμμα πριν από μία εβδομάδα. Να γράφει το αλφάβητο με το πόδι, δύο φορές τη μέρα. Στάση στο ένα πόδι, τριάντα δευτερόλεπτα, τρεις φορές. Πάγο δέκα λεπτά το βράδυ. Να φοράει τον νάρθηκα όταν περπατάει έξω.",
  "synth-calisthenics":
    "Έχουμε τον Γιώργο, είναι αθλητής καλλιστενικής, 22 χρονών. Έκανε την εγχείρηση τώρα τελευταία και πρέπει να ενδυναμώσει τον δεξί του ώμο. Η πρώτη άσκηση θα είναι weighted pull-ups με 40 κιλά, 3 sets, 10 επαναλήψεις. Η δεύτερη άσκηση θα είναι front lever raises, 3 sets, 6 επαναλήψεις. Και για το τέλος, front lever rows, 3 sets, 10 επαναλήψεις.",
};

function makeSyntheticNotes() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const examples = path.join(ROOT, "..", "02-product", "examples");
  const texts: Record<string, string> = { ...SYNTHETIC };
  for (const id of ["02", "03", "04"]) texts[`synth-${id}`] = readFileSync(path.join(examples, `${id}-input.txt`), "utf8").trim();
  console.log(`test-audio/ has no recordings yet: making ${Object.keys(texts).length} synthetic phone-quality notes…`);
  for (const [name, text] of Object.entries(texts)) {
    const aiff = path.join(AUDIO_DIR, `${name}.aiff`);
    const spoken = text.replace(/([.;])\s+/g, "$1 [[slnc 1600]] "); // a physio pausing between sentences
    execFileSync("say", ["-v", "Melina", "-r", "185", "-o", aiff, spoken]);
    // Like a cheap phone in a clinic: 300–3400 Hz, background noise, Opus 24 kbps.
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", aiff, "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.035:seed=7",
      "-filter_complex", "[0:a]highpass=f=300,lowpass=f=3400,volume=0.7[v];[v][1:a]amix=inputs=2:duration=first:normalize=0[m]",
      "-map", "[m]", "-ac", "1", "-c:a", "libopus", "-b:a", "24k", path.join(AUDIO_DIR, `${name}.webm`),
    ]);
    execFileSync("rm", [aiff]);
    writeFileSync(path.join(AUDIO_DIR, `${name}.txt`), `${text}\n`);
  }
}

function loadNotes(): Note[] {
  if (!existsSync(AUDIO_DIR) || !readdirSync(AUDIO_DIR).some((f) => AUDIO_EXT.test(f))) makeSyntheticNotes();
  const notes: Note[] = [];
  for (const file of readdirSync(AUDIO_DIR).filter((f) => AUDIO_EXT.test(f)).sort()) {
    const name = file.replace(AUDIO_EXT, "");
    const txt = path.join(AUDIO_DIR, `${name}.txt`);
    if (!existsSync(txt)) {
      console.log(`  skip ${file}: no ${name}.txt with the exact words`);
      continue;
    }
    notes.push({ name, audio: path.join(AUDIO_DIR, file), text: readFileSync(txt, "utf8").trim() });
  }
  return notes;
}

// ---- engines to compare ----
// Whisper runs once per downloaded model; cloud engines only when their key is in .env.
type Engine = { label: string; env: Record<string, string> };
function engines(): Engine[] {
  const wanted = (process.argv.find((a) => a.startsWith("--engines="))?.split("=")[1] ?? "local,openai,azure").split(",");
  const list: Engine[] = [];
  if (wanted.includes("local")) {
    const models = existsSync(MODELS_DIR) ? readdirSync(MODELS_DIR).filter((f) => /^ggml-.*\.bin$/.test(f) && !f.includes("silero")).sort() : [];
    for (const model of models) list.push({ label: `whisper ${model}`, env: { SPEECH: "local", WHISPER_MODEL: path.join(MODELS_DIR, model) } });
  }
  if (wanted.includes("openai") && process.env.OPENAI_API_KEY)
    list.push({ label: `openai ${process.env.OPENAI_SPEECH_MODEL || "gpt-transcribe"}`, env: { SPEECH: "openai" } });
  if (wanted.includes("azure") && process.env.AZURE_SPEECH_KEY) list.push({ label: "azure el-GR", env: { SPEECH: "azure" } });
  return list;
}

// ---- one engine (runs in a child process, because the app reads WHISPER_MODEL once at start) ----
async function measureEngine(notes: Note[]): Promise<NoteResult[]> {
  const { transcribe, warmUpWhisper } = await import("@/app/lib/transcribe");
  const { proofread } = await import("@/app/lib/proofread");
  await warmUpWhisper(); // Whisper's first run is slow; the app does this at start too (no-op for cloud engines)
  const results: NoteResult[] = [];
  for (const note of notes) {
    const heard = await transcribe(readFileSync(note.audio));
    const checked = await proofread(heard.text);
    results.push({
      name: note.name,
      speechSeconds: heard.seconds,
      proofreadSeconds: checked.seconds,
      heard: score(note.text, heard.text),
      checked: score(note.text, checked.text),
      fixes: checked.fixes.length,
      text: checked.text,
    });
  }
  return results;
}

// ---- program step: effort medium vs low on the exact words ----
async function compareEffort(notes: Note[]) {
  const { generate } = await import("@/app/lib/generate");
  const summary = (exercises: { name: string; sets: number | null; reps: string | null; hold: string | null; frequency: string | null }[]) =>
    exercises.map((e) => `${e.name.toLowerCase()} · ${e.sets ?? "–"} × ${e.reps ?? "–"} · ${e.hold ?? "–"} · ${e.frequency ?? "–"}`);
  console.log("\nProgram step (Claude Opus 5.5) on the exact words, effort medium vs low:");
  for (const note of notes) {
    const medium = await generate(note.text, "el", { effort: "medium" });
    const low = await generate(note.text, "el", { effort: "low" });
    const a = summary(medium.result.program.exercises);
    const b = summary(low.result.program.exercises);
    const same = a.length === b.length && a.every((line, i) => line === b[i]);
    console.log(`  ${note.name.padEnd(20)} medium ${String(medium.seconds).padStart(5)} s · low ${String(low.seconds).padStart(5)} s · exercises ${same ? "identical" : "DIFFERENT"}`);
    if (!same) console.log(`    medium: ${a.join(" | ")}\n    low:    ${b.join(" | ")}`);
  }
}

// ---- main ----
const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(6);
const average = (rows: NoteResult[], pick: (r: NoteResult) => number) => rows.reduce((sum, r) => sum + pick(r), 0) / rows.length;

if (process.env.BENCH_CHILD) {
  const notes: Note[] = JSON.parse(process.env.BENCH_NOTES ?? "[]");
  console.log(`BENCH_RESULT ${JSON.stringify(await measureEngine(notes))}`);
} else {
  const notes = loadNotes();
  const list = engines();
  console.log(`${notes.length} notes · engines: ${list.map((e) => e.label).join(", ")}\n`);
  for (const engine of list) {
    let output: string;
    try {
      output = execFileSync(process.execPath, [...process.execArgv, process.argv[1]], {
        env: { ...process.env, ...engine.env, BENCH_CHILD: "1", BENCH_NOTES: JSON.stringify(notes) },
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch (e) {
      console.log(`${engine.label}\n  failed: ${(e as Error).message.split("\n").slice(0, 3).join(" ")}\n`);
      continue; // one engine failing (no credit, no network) shouldn't hide the others
    }
    const line = output.split("\n").find((l) => l.startsWith("BENCH_RESULT "));
    if (!line) throw new Error(`No result for ${engine.label}:\n${output}`);
    const rows: NoteResult[] = JSON.parse(line.slice("BENCH_RESULT ".length));
    console.log(`${engine.label}`);
    console.log(
      `  words kept ${pct(average(rows, (r) => r.heard.kept))} → ${pct(average(rows, (r) => r.checked.kept))} after proofreading` +
        ` · numbers kept ${pct(average(rows, (r) => r.checked.numbers))} · WER ${pct(average(rows, (r) => r.checked.wer))}` +
        ` · ${average(rows, (r) => r.speechSeconds).toFixed(1)} s + ${average(rows, (r) => r.proofreadSeconds).toFixed(1)} s per note`,
    );
    for (const r of rows)
      console.log(
        `    ${r.name.padEnd(20)} ${pct(r.heard.kept)} → ${pct(r.checked.kept)} · numbers ${pct(r.checked.numbers)} · ${r.fixes} fixes · ${r.speechSeconds} s + ${r.proofreadSeconds} s`,
      );
    console.log("");
  }
  if (process.argv.includes("--generate")) await compareEffort(notes);
}
