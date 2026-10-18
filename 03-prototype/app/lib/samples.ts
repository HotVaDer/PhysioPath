// Fictional sample voice notes from 02-product/examples/, for demos without recording.
import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { EXAMPLES_DIR } from "@/app/lib/config";

export type Sample = { id: string; title: string; text: string };

export async function listSamples(): Promise<Sample[]> {
  const files = (await readdir(EXAMPLES_DIR)).filter((f) => /^\d+-input\.txt$/.test(f)).sort();
  const list: Sample[] = [];
  for (const file of files) {
    const text = (await readFile(join(EXAMPLES_DIR, file), "utf8")).trim();
    if (!/[α-ωΑ-Ω]/.test(text)) continue; // Greek samples only
    list.push({ id: file.slice(0, 2), title: text.split(/[.,]/).slice(0, 2).join(",").trim(), text });
  }
  return list;
}
