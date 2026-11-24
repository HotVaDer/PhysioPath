// The body area of a template («Γόνατο», «Ώμος»), and finding templates quickly on the recording page:
// search as you type, groups by area, and «Προτεινόμενα» (the templates for the area the physio wrote in
// this patient's last note). Plain text matching: nothing here is a clinical judgement. The physio wrote
// the note's area and named the templates; this only sorts the list, and every template stays in it.
// Pure, so it is easy to test.

// Side words don't change the area: «Αριστερό γόνατο» and «Δεξί γόνατο» both use the knee templates.
// Compared as keys: without accents, capitals and the final ς (see key).
const SIDE_WORDS = [
  "αριστερο", "αριστερος", "αριστερη", "αριστερα", "αριστερου", "αριστερης", "αριστερων", "αρ",
  "δεξι", "δεξιο", "δεξιος", "δεξια", "δεξιου", "δεξιας", "δεξιων", "δε",
  "αμφοτεροπλευρο", "αμφοτεροπλευρα", "αμφοτεροπλευρη", "αμφοτεροπλευρως",
  "left", "right", "bilateral", "both", "lt", "rt", "l", "r",
];

// Lower case, no accents (ά → α, ϊ → ι), no punctuation, single spaces.
export function key(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const SIDES = new Set(SIDE_WORDS.map((word) => key(word)));
const withoutSides = (keys: string[]) => keys.filter((k) => !SIDES.has(k));

// A template's area from a note's «Περιοχή σώματος»: the side words dropped, the rest kept as written,
// with a capital first letter. «αριστερό γόνατο» → «Γόνατο». Nothing left → null.
export function areaFromBodyArea(bodyArea: string | null | undefined): string | null {
  const words = (bodyArea ?? "").trim().split(/\s+/).filter(Boolean);
  const kept = words.filter((word) => {
    const k = key(word);
    return k !== "" && !SIDES.has(k);
  });
  const area = kept.join(" ").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "").slice(0, 60);
  if (!area) return null;
  return area.charAt(0).toUpperCase() + area.slice(1); // not toLocaleUpperCase("el"): that drops the accent (ώ → Ω)
}

// The area to compare: the key without side words.
function areaKey(text: string | null | undefined): string {
  return withoutSides(key(text).split(" ").filter(Boolean)).join(" ");
}

// Same area: equal once sides, accents and capitals are gone, or one contains the other as whole words
// («Γόνατο» and «Οπίσθιο γόνατο»). Very short words (under 3 letters) never match on their own.
export function sameArea(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = areaKey(a);
  const kb = areaKey(b);
  if (ka.length < 3 || kb.length < 3) return false;
  if (ka === kb) return true;
  const contains = (long: string, short: string) => ` ${long} `.includes(` ${short} `);
  return contains(ka, kb) || contains(kb, ka);
}

export type FindableTemplate = { id: string; name: string; area: string | null; uses: number };

// Search as you type: every word typed must start a word of the name or the area («γον acl» finds
// «Γόνατο μετά ACL»). An empty search matches everything.
export function matchesSearch(template: FindableTemplate, query: string): boolean {
  const wanted = key(query).split(" ").filter(Boolean);
  if (wanted.length === 0) return true;
  const words = key(`${template.name} ${template.area ?? ""}`).split(" ").filter(Boolean);
  return wanted.every((w) => words.some((word) => word.startsWith(w)));
}

// Most used first, then A to Ω.
const byUse = (a: FindableTemplate, b: FindableTemplate) => b.uses - a.uses || a.name.localeCompare(b.name, "el");

export type TemplateGroups<T extends FindableTemplate> = {
  // «Προτεινόμενα»: the area of the patient's last note, and its templates (empty when there is none).
  suggested: { area: string; templates: T[] } | null;
  // Every template that matches the search, by area (A to Ω), «Χωρίς περιοχή» last.
  groups: { area: string | null; templates: T[] }[];
};

// What the picker shows. Suggested templates appear in their area's group too: nothing is ever hidden.
export function groupTemplates<T extends FindableTemplate>(templates: T[], query: string, patientArea: string | null): TemplateGroups<T> {
  const found = templates.filter((t) => matchesSearch(t, query));
  const suggestedList = patientArea ? found.filter((t) => sameArea(t.area, patientArea)).sort(byUse) : [];
  const shownArea = areaFromBodyArea(patientArea);
  const byArea = new Map<string, { area: string | null; templates: T[] }>();
  for (const t of found) {
    const k = areaKey(t.area) || "\u0000none";
    const group = byArea.get(k) ?? { area: t.area?.trim() || null, templates: [] };
    group.templates.push(t);
    byArea.set(k, group);
  }
  const groups = [...byArea.values()]
    .map((g) => ({ ...g, templates: g.templates.sort(byUse) }))
    .sort((a, b) => (a.area === null ? 1 : b.area === null ? -1 : a.area.localeCompare(b.area, "el")));
  return {
    suggested: suggestedList.length > 0 && shownArea ? { area: shownArea, templates: suggestedList } : null,
    groups,
  };
}
