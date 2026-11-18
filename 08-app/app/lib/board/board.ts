// What the room board shows: the clinic's rooms and every open card (a patient exercising now).
// Read with the signed-in person's own client, so Row Level Security decides: their clinic only,
// every role (assistants too). Notes are never read here: the board needs no clinical note.
import "server-only";

import type { Call, CallReason } from "@/app/lib/board/session";
import type { Room } from "@/app/lib/notes/approval";
import { readProgram } from "@/app/lib/notes/schema";
import type { Supabase } from "@/app/lib/supabase/server";

export type BoardCard = {
  id: string;
  programId: string;
  roomId: string | null;
  slot: number | null;
  label: string; // the patient's short name or code
  title: string; // the program's title
  exercises: string[]; // names, in order
  setsTarget: number[];
  setsDone: number[];
  current: number;
  call: Call | null;
  createdAt: string;
};
export type BoardData = { rooms: Room[]; cards: BoardCard[] };

// Cards older than 12 hours are left over from another day (approve_program closes them).
const OPEN_FOR_MS = 12 * 60 * 60 * 1000;

export async function loadBoard(supabase: Supabase): Promise<BoardData> {
  const since = new Date(Date.now() - OPEN_FOR_MS).toISOString();
  const [rooms, sessions] = await Promise.all([
    supabase.from("rooms").select("id, name, beds, stations").order("position"),
    supabase
      .from("sessions")
      .select("id, program_id, patient_id, room_id, slot, sets_target, sets_done, current_exercise, call_reason, call_at, created_at")
      .is("finished_at", null)
      .gt("created_at", since)
      .order("created_at"),
  ]);
  if (rooms.error) throw rooms.error;
  if (sessions.error) throw sessions.error;
  const open = sessions.data ?? [];

  const programIds = [...new Set(open.map((s) => s.program_id as string))];
  const patientIds = [...new Set(open.map((s) => s.patient_id as string | null).filter((id): id is string => Boolean(id)))];
  const [programs, patients] = await Promise.all([
    programIds.length ? supabase.from("programs").select("id, program").in("id", programIds) : Promise.resolve({ data: [], error: null }),
    patientIds.length ? supabase.from("patients").select("id, label").in("id", patientIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (programs.error) throw programs.error;
  if (patients.error) throw patients.error;
  const programById = new Map((programs.data ?? []).map((p) => [p.id as string, readProgram(p.program)]));
  const labelById = new Map((patients.data ?? []).map((p) => [p.id as string, p.label as string]));

  const cards = open.map((s): BoardCard => {
    const program = programById.get(s.program_id as string) ?? null;
    return {
      id: s.id as string,
      programId: s.program_id as string,
      roomId: s.room_id as string | null,
      slot: s.slot as number | null,
      label: (s.patient_id && labelById.get(s.patient_id as string)) || program?.patient_first_name || "Ασθενής",
      title: program?.title ?? "Πρόγραμμα ασκήσεων",
      exercises: program?.exercises.map((e) => e.name) ?? [],
      setsTarget: s.sets_target as number[],
      setsDone: s.sets_done as number[],
      current: s.current_exercise as number,
      call: s.call_reason ? { reason: s.call_reason as CallReason, at: s.call_at as string } : null,
      createdAt: s.created_at as string,
    };
  });
  return { rooms: (rooms.data ?? []) as Room[], cards };
}
