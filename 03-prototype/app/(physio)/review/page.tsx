// Step 2 · Review. Everything on this page lives in the browser's draft, so the page itself is just the screen.
import type { Metadata } from "next";

import { ReviewScreen } from "@/app/features/review/ReviewScreen";

export const metadata: Metadata = { title: "Έλεγχος" };

export default function ReviewPage() {
  return <ReviewScreen />;
}
