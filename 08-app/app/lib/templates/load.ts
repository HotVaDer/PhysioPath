// Reading the clinic's templates («Πρότυπα») for /templates. The database gives owners and physios their
// open clinic's rows only (20261124180000); assistants get none.
import "server-only";

import { readProgram, type PatientProgram } from "@/app/lib/notes/schema";
import type { Supabase } from "@/app/lib/supabase/server";

// The longest name the database takes (templates.name).
export const TEMPLATE_NAME_MAX = 80;
export const TEMPLATE_AREA_MAX = 60;

// What the pages say after an action. "taken": that name is already in the library.
export type TemplateResult = "saved" | "renamed" | "archived" | "taken" | "badname" | "badarea" | "failed";

// area: «Γόνατο», «Ώμος»… or null. uses: approved programs that started from it (for ordering).
export type Template = { id: string; name: string; area: string | null; uses: number; createdAt: string; program: PatientProgram };

// The library: templates not archived, A to Ω. A row whose program this code can't read is left out.
export async function loadTemplates(supabase: Supabase): Promise<Template[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, area, uses, program, created_at")
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`templates: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const program = readProgram(row.program);
    return program
      ? [
          {
            id: row.id as string,
            name: row.name as string,
            area: (row.area as string | null) ?? null,
            uses: (row.uses as number | null) ?? 0,
            createdAt: row.created_at as string,
            program,
          },
        ]
      : [];
  });
}
