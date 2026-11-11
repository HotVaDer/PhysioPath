// One part of a page: a white card with soft corners, like the exercise cards on the patient screen.
// The heading is a short tag (a teal pill, e.g. "01") and the title in sentence case.
// With a title it becomes a named region, so screen-reader users can jump between sections.
// The page picks the heading level, to keep the heading order right.
import { useId, type ComponentProps, type ReactNode } from "react";

import { cx } from "@/app/lib/cx";

type CardProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  tag?: string; // short code before the title, e.g. "01"
  headingLevel?: 2 | 3 | 4;
};

export function Card({ title, tag, headingLevel = 2, className, children, ...props }: CardProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cx("rounded-card border border-border bg-surface p-5 sm:p-6", className)}
      {...props}
    >
      {title && (
        <Heading id={headingId} className="mb-5 flex items-center gap-3 text-xl font-bold">
          {tag && (
            <>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm text-on-primary">{tag}</span>{" "}
            </>
          )}
          {title}
        </Heading>
      )}
      {children}
    </section>
  );
}
