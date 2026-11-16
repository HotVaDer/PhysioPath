// What each sheet of the registration form may contain, with the error shown next to the field.
// The limits match the database checks (supabase/migrations/20261115000000_onboarding.sql), so a
// value that passes here never fails there. Everything a browser sends is checked again here:
// never trust the form.
import { z } from "zod";

export const CITIES = ["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Αμμόχωστος", "Άλλη"] as const;
export const ROLES = { physio: "Φυσιοθεραπευτής", assistant: "Βοηθός" } as const;
export type Role = keyof typeof ROLES;

const name = (what: string, max = 120) =>
  z
    .string({ error: `Γράψτε ${what}.` })
    .trim()
    .min(1, `Γράψτε ${what}.`)
    .max(max, `Το πολύ ${max} χαρακτήρες.`);

const email = z
  .string({ error: "Γράψτε ένα email." })
  .trim()
  .toLowerCase()
  .min(1, "Γράψτε το email σας.")
  .max(254, "Αυτό το email είναι πολύ μεγάλο.")
  .pipe(z.email("Αυτό δεν μοιάζει με email. Παράδειγμα: maria@example.com"));

// Cover: who is signing up (before they have an account).
export const CoverSchema = z.object({
  fullName: name("το ονοματεπώνυμό σας"),
  email,
});

// Login for someone who already has an account (or an invitee whose link expired).
export const LoginSchema = z.object({ email });

// §1 Στοιχεία κλινικής
export const ClinicSchema = z.object({
  ownerName: name("το ονοματεπώνυμό σας"),
  clinicName: name("το όνομα της κλινικής"),
  city: z.enum(CITIES, { error: "Διαλέξτε πόλη." }),
  phone: z
    .string({ error: "Γράψτε ένα τηλέφωνο." })
    .trim()
    .regex(/^[0-9 +()-]{6,20}$/, "Μόνο ψηφία, κενά και + ( ) -. Παράδειγμα: 25 000 000")
    .refine((v) => (v.match(/\d/g) ?? []).length >= 6, "Το τηλέφωνο έχει τουλάχιστον 6 ψηφία."),
});

// §2 Χώροι: one line of the ledger
const count = z.coerce
  .number({ error: "Γράψτε έναν αριθμό." })
  .int("Ολόκληρος αριθμός.")
  .min(0, "Από 0 έως 40.")
  .max(40, "Από 0 έως 40.");

export const RoomSchema = z
  .object({ name: name("το όνομα του χώρου", 40), beds: count, stations: count })
  .refine((r) => r.beds + r.stations > 0, { message: "Βάλτε τουλάχιστον ένα κρεβάτι ή μία θέση.", path: ["beds"] });

export const RoomsSchema = z
  .array(RoomSchema)
  .min(1, "Χρειάζεται τουλάχιστον ένας χώρος.")
  .max(30, "Το πολύ 30 χώροι.");

// §3 Ομάδα: one person to invite
export const MemberSchema = z.object({
  email,
  role: z.enum(["physio", "assistant"], { error: "Διαλέξτε ρόλο." }),
});

export const TeamSchema = z
  .array(MemberSchema)
  .max(30, "Το πολύ 30 άτομα. Τους υπόλοιπους τους καλείτε από τις Ρυθμίσεις.")
  .refine((team) => new Set(team.map((m) => m.email)).size === team.length, "Το ίδιο email υπάρχει δύο φορές.");

// The half-filled form as saved in onboarding_drafts. Every part is optional until it's filled.
export const DraftSchema = z.object({
  ownerName: z.string().optional(),
  clinicName: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  rooms: z.array(z.object({ name: z.string(), beds: z.number(), stations: z.number() })).optional(),
  team: z.array(z.object({ email: z.string(), role: z.enum(["physio", "assistant"]) })).optional(),
});
export type Draft = z.infer<typeof DraftSchema>;

// Sign-up, step 3: the clinic, how many beds, and the agreement. Rooms, exercise stations and the
// team are set up later from the home page; sign-up makes one room with these beds.
export const RegisterClinicSchema = ClinicSchema.extend({
  beds: z.coerce
    .number({ error: "Γράψτε πόσα κρεβάτια έχετε." })
    .int("Γράψτε πόσα κρεβάτια έχετε.")
    .min(1, "Βάλτε τουλάχιστον 1 κρεβάτι.")
    .max(40, "Το πολύ 40 κρεβάτια. Τα υπόλοιπα τα προσθέτετε μετά."),
  consent: z.literal("on", { error: "Για να ολοκληρωθεί η εγγραφή, τσεκάρετε ότι συμφωνείτε." }),
});

// The one room sign-up creates (renamed, split or added to later from the home page).
export const firstRoom = (beds: number) => [{ name: "Αίθουσα", beds, stations: 0 }];

// The 6-digit code from the email. People copy it with spaces or a dash ("123 456"): those are dropped.
export const CodeSchema = z
  .string({ error: "Γράψτε τον κωδικό από το email." })
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .min(1, "Γράψτε τον κωδικό από το email.")
      .regex(/^\d{6}$/, "Ο κωδικός έχει 6 ψηφία. Τον βρίσκετε στο email που σας στείλαμε."),
  );

// Field errors as { field: "first message" }, ready for the form to show next to each input.
export type FieldErrors = Record<string, string>;
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
