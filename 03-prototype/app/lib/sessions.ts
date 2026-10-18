// The sessions running in the room, kept in memory for speed and written to output/sessions/<id>.json
// so a server restart doesn't lose them. The rules for changing a session live in session.ts.
import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { OUTPUT_DIR } from "@/app/lib/config";
import { newId } from "@/app/lib/programs";
import type { ClinicalNote, PatientProgram } from "@/app/lib/schema";
import { SESSION_ID_PATTERN, Session, startSession } from "@/app/lib/session";

const SESSIONS_DIR = join(OUTPUT_DIR, "sessions");

// On globalThis because Next.js can load this module more than once (per route bundle, and on
// every hot reload), and all routes must see the same sessions.
const shared = globalThis as typeof globalThis & { physiopathSessions?: Map<string, Session> };

function sessions(): Map<string, Session> {
  if (shared.physiopathSessions) return shared.physiopathSessions;
  const map = new Map<string, Session>();
  if (existsSync(SESSIONS_DIR)) {
    for (const file of readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"))) {
      const parsed = Session.safeParse(JSON.parse(readFileSync(join(SESSIONS_DIR, file), "utf8")));
      if (parsed.success && !parsed.data.finishedAt) map.set(parsed.data.id, parsed.data);
    }
  }
  shared.physiopathSessions = map;
  return map;
}

async function save(session: Session) {
  sessions().set(session.id, session);
  await mkdir(SESSIONS_DIR, { recursive: true });
  await writeFile(join(SESSIONS_DIR, `${session.id}.json`), JSON.stringify(session, null, 2));
}

// The room board: sessions the physio hasn't closed yet, oldest first.
export const listSessions = () =>
  [...sessions().values()].filter((s) => !s.finishedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const getSession = (id: string) => (SESSION_ID_PATTERN.test(id) ? (sessions().get(id) ?? null) : null);

export async function createSession(program: PatientProgram, note: ClinicalNote): Promise<Session> {
  const session = startSession(program, note, newId(), new Date().toISOString());
  await save(session);
  return session;
}

// Applies one change. Returns null when the session doesn't exist; saves only when something changed.
export async function updateSession(id: string, change: (session: Session, now: string) => Session): Promise<Session | null> {
  const session = getSession(id);
  if (!session) return null;
  const updated = change(session, new Date().toISOString());
  if (updated !== session) await save(updated);
  return updated;
}
