// What a demo clinic has left of its AI calls: public.demo_ai_left() (20261124200000).
// generate = programs and notes (Claude, the costly call), transcribe = recordings (OpenAI). 5 of each.
import * as z from "zod";

export const DemoLeft = z.object({ of: z.number().int(), generate: z.number().int(), transcribe: z.number().int() });
export type DemoLeft = z.infer<typeof DemoLeft>;
