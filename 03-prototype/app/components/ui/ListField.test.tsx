import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ListField, toItems } from "@/app/components/ui/ListField";
import { expectNoA11yViolations } from "@/app/test/axe";

// A parent that owns the list, like the review page will.
function Harness({ initial, onItems }: { initial: string[]; onItems?: (items: string[]) => void }) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <ListField
        label="Αποφύγετε"
        value={items}
        onChange={(next) => {
          setItems(next);
          onItems?.(next);
        }}
      />
      <button type="button" onClick={() => setItems(["Τρέξιμο"])}>
        Αντικατάσταση
      </button>
    </>
  );
}

describe("toItems", () => {
  it("one item per line, trimmed, empty lines dropped", () => {
    expect(toItems("  Πάγος 15'  \n\n Ξεκούραση\n")).toEqual(["Πάγος 15'", "Ξεκούραση"]);
  });
});

describe("ListField", () => {
  it("shows the list one item per line, with the default hint", () => {
    render(<Harness initial={["Σκάλες", "Βάρη"]} />);
    const field = screen.getByLabelText("Αποφύγετε");
    expect(field).toHaveValue("Σκάλες\nΒάρη");
    expect(field).toHaveAccessibleDescription("Μία οδηγία ανά γραμμή.");
  });

  it("adds an item on a new line, and Enter isn't swallowed", async () => {
    const onItems = vi.fn();
    render(<Harness initial={["Σκάλες"]} onItems={onItems} />);
    const field = screen.getByLabelText("Αποφύγετε");

    await userEvent.type(field, "{Enter}");
    expect(field).toHaveValue("Σκάλες\n"); // the empty line stays while typing
    expect(onItems).toHaveBeenLastCalledWith(["Σκάλες"]);

    await userEvent.type(field, "Βάρη");
    expect(onItems).toHaveBeenLastCalledWith(["Σκάλες", "Βάρη"]);
  });

  it("shows a list that changes from outside", async () => {
    render(<Harness initial={["Σκάλες"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Αντικατάσταση" }));
    expect(screen.getByLabelText("Αποφύγετε")).toHaveValue("Τρέξιμο");
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<Harness initial={["Σκάλες"]} />);
    await expectNoA11yViolations(container);
  });
});
