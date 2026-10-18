import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "@/app/components/ui/SegmentedControl";
import { expectNoA11yViolations } from "@/app/test/axe";

type Lang = "el" | "en";

function Harness({ onChange }: { onChange?: (value: Lang) => void }) {
  const [lang, setLang] = useState<Lang>("el");
  return (
    <SegmentedControl
      legend="Γλώσσα κλινικής σημείωσης"
      options={[
        { value: "el", label: "Ελληνικά" },
        { value: "en", label: "English" },
      ]}
      value={lang}
      onChange={(value) => {
        setLang(value);
        onChange?.(value);
      }}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a named group of radio buttons with the current value checked", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Γλώσσα κλινικής σημείωσης" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ελληνικά" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "English" })).not.toBeChecked();
  });

  it("changes on click", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByText("English"));
    expect(onChange).toHaveBeenCalledWith("en");
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
  });

  it("works with the keyboard: Tab to it, arrow keys to change", async () => {
    render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Ελληνικά" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<Harness />);
    await expectNoA11yViolations(container);
  });
});
