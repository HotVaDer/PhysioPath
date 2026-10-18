// GET /api/samples: the fictional Greek sample notes behind the "Δείγμα" buttons.
import { handler } from "@/app/lib/http";
import { listSamples } from "@/app/lib/samples";

export const GET = handler(() => listSamples());
