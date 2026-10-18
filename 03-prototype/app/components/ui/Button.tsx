// The only button in the app, so every button is big enough, has a focus ring and shows text.
// Button is for actions; ButtonLink looks the same but goes to a page.
// Look: the portfolio's sharp corners and racing orange for the one main action.
import type { Route } from "next";
import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { ExternalIcon } from "@/app/components/ui/icons";
import { SpinnerRing } from "@/app/components/ui/Spinner";
import { cx } from "@/app/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

type Look = {
  variant?: Variant; // primary: the one main action on a page
  size?: Size;
  icon?: ReactNode; // shown before the text, never instead of it
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  secondary: "border border-border-strong text-foreground hover:border-foreground hover:bg-surface-muted",
  ghost: "text-primary-text underline decoration-1 underline-offset-4 hover:decoration-2",
  danger: "border border-danger text-danger hover:bg-danger-bg",
};

// At our 18px text size min-h-10 is 45px, above the 44px touch-target minimum (WCAG 2.2 AAA).
// lg is for the one main action on a page; xl for the record button and the patient page.
const SIZES: Record<Size, string> = {
  md: "min-h-10 px-4 text-base",
  lg: "min-h-11 px-5 text-base",
  xl: "min-h-14 px-7 text-lg",
};

// Disabled buttons get a dashed outline and muted (still readable) text instead of fading out.
function buttonClasses({ variant = "secondary", size = "md" }: Look, className?: string) {
  return cx(
    "inline-flex min-w-10 items-center justify-center gap-2 rounded-sm font-semibold transition",
    "disabled:cursor-not-allowed disabled:border disabled:border-dashed disabled:border-border-strong disabled:bg-transparent disabled:text-muted disabled:no-underline disabled:brightness-100",
    "aria-busy:cursor-wait",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> &
  Look & {
    children: ReactNode; // the visible text
    loading?: boolean; // shows a spinner, keeps the text, and ignores clicks
  };

export function Button({ variant, size, icon, loading = false, type = "button", className, onClick, children, ...props }: ButtonProps) {
  // While loading the button stays focusable (no `disabled`), so keyboard users don't lose their place.
  const handleClick = loading ? (event: MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick;
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size }, className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {loading ? <SpinnerRing /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<"a">, "href"> &
  Look & {
    href: Route;
    children: ReactNode;
    newTab?: boolean; // opens in a new tab and says so, in words and with an icon
    reloadDocument?: boolean; // a full page load instead of an in-app move (patient pages set their text size before drawing)
  };

export function ButtonLink({ variant, size, icon, href, newTab = false, reloadDocument = false, className, children, ...props }: ButtonLinkProps) {
  const linkProps = {
    href,
    className: buttonClasses({ variant, size }, className),
    ...(newTab && { target: "_blank", rel: "noopener noreferrer" }),
    ...props,
  };
  const content = (
    <>
      {icon}
      {children}
      {newTab && (
        <>
          <ExternalIcon size={18} />
          {/* The space sits outside the span: screen readers drop spaces at the edge of an element. */}{" "}
          <span className="sr-only">(ανοίγει σε νέα καρτέλα)</span>
        </>
      )}
    </>
  );
  return reloadDocument ? <a {...linkProps}>{content}</a> : <Link {...linkProps}>{content}</Link>;
}
