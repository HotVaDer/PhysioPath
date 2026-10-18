import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, ButtonLink } from "@/app/components/ui/Button";
import { PlusIcon } from "@/app/components/ui/icons";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("Button", () => {
  it("is named by its text and doesn't submit forms by default", () => {
    render(<Button icon={<PlusIcon />}>Προσθήκη άσκησης</Button>);
    const button = screen.getByRole("button", { name: "Προσθήκη άσκησης" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Έγκριση</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Έγκριση" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("while loading: keeps its text, stays focusable, says it's busy and ignores clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Δημιουργία προγράμματος
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Δημιουργία προγράμματος" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("can be disabled", () => {
    render(<Button disabled>Έγκριση</Button>);
    expect(screen.getByRole("button", { name: "Έγκριση" })).toBeDisabled();
  });

  it("has no accessibility problems", async () => {
    const { container } = render(
      <div>
        <Button variant="primary" size="lg">
          Έγκριση
        </Button>
        <Button variant="ghost">Πίσω</Button>
        <Button variant="danger">Αφαίρεση</Button>
        <Button loading>Αποθήκευση</Button>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("ButtonLink", () => {
  it("is a link named by its text", () => {
    render(<ButtonLink href="/">Νέα σημείωση</ButtonLink>);
    expect(screen.getByRole("link", { name: "Νέα σημείωση" })).toHaveAttribute("href", "/");
  });

  it("says in words when it opens a new tab", async () => {
    const { container } = render(
      <ButtonLink href="/" newTab>
        Άνοιγμα σελίδας ασθενή
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Άνοιγμα σελίδας ασθενή (ανοίγει σε νέα καρτέλα)" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expectNoA11yViolations(container);
  });
});
