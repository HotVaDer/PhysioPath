"use client";
// When a page can't be shown (no internet, or the database didn't answer): a Greek card instead of
// Next's English "Application error". Pages with their own (the home program, /p) keep theirs.
// The words fit staff and patients alike, since a patient's session page lands here too.
// «Δοκιμάστε ξανά» asks the server for the page again (retry, Next 16); nothing typed is sent.
import { useEffect } from "react";

import { Card } from "@/app/components/paper/Card";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error); // only a code (digest) in production; the details stay in the server log
  }, [error]);

  return (
    <Card>
      <h1 className="font-display text-[30px] leading-tight sm:text-[34px]">Η σελίδα δεν άνοιξε</h1>
      <p>Κάτι δεν πήγε καλά με τη σύνδεση ή με τη δική μας πλευρά.</p>
      <p className="text-muted">Ελέγξτε ότι υπάρχει σύνδεση στο διαδίκτυο και δοκιμάστε ξανά.</p>
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
