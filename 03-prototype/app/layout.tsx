import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

// Fonts are self-hosted (no requests to Google from the user's browser), both with Greek letters.
// Inter for text (italic too, for the big headings), JetBrains Mono for the small capital labels.
// The portfolio uses DM Mono, but it has no Greek. globals.css picks them up via the CSS variables.
const inter = Inter({ subsets: ["latin", "greek"], style: ["normal", "italic"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin", "greek"], weight: ["400", "500"], variable: "--font-jetbrains-mono" });

// Browser tab title. Each page sets its own name, e.g. "Έλεγχος · PhysioPath".
export const metadata: Metadata = {
  title: { template: "%s · PhysioPath", default: "PhysioPath" },
  description: "Από τη φωνητική σημείωση του φυσιοθεραπευτή σε πρόγραμμα ασκήσεων για τον ασθενή.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the patient page sets the text size on <html> before React starts (see app/p/[id]).
    <html lang="el" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* Hidden until a keyboard user presses Tab: lets them jump past the header straight to the content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold"
        >
          Μετάβαση στο περιεχόμενο
        </a>
        {children}
      </body>
    </html>
  );
}
