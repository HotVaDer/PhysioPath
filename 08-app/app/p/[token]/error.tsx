"use client";
// When the home program can't be loaded (no internet, or the database didn't answer): a Greek card
// in the same look as «Δεν βρέθηκε», instead of Next's English "This page couldn't load".
// The link itself is fine, so the patient can simply try again. The clinic's phone isn't known here
// (it comes from the same database), so the text says to call the clinic.
import { useEffect } from "react";

import { Card } from "@/app/components/paper/Card";

export default function HomeProgramError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error); // only a code (digest) in production; the details stay in the server log
  }, [error]);

  return (
    <Card>
      <h1 className="font-display text-[30px] leading-tight sm:text-[34px]">Το πρόγραμμα δεν άνοιξε</h1>
      <p>Δεν φταίτε εσείς: κάτι δεν πήγε καλά με τη σύνδεση ή με τη δική μας πλευρά.</p>
      <p className="text-muted">Δοκιμάστε ξανά σε λίγο. Αν συνεχίσει, πάρτε τηλέφωνο την κλινική σας.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex min-h-14 cursor-pointer items-center self-start bg-action px-6 text-[19px] font-bold text-white hover:bg-action-hover"
      >
        Δοκιμάστε ξανά
      </button>
    </Card>
  );
}
