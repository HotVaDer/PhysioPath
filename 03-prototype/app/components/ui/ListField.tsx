// A list typed as one item per line (e.g. "Αποφύγετε"), handed to the page as string[].
// Uses state, so use it inside a Client Component ("use client"), like the other interactive parts.
import { useState } from "react";

import { TextArea, type TextAreaProps } from "@/app/components/ui/TextArea";

type ListFieldProps = Omit<TextAreaProps, "value" | "defaultValue" | "onChange"> & {
  value: string[];
  onChange: (items: string[]) => void;
};

export const toItems = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((item, i) => item === b[i]);

export function ListField({ value, onChange, hint = "Μία οδηγία ανά γραμμή.", ...props }: ListFieldProps) {
  // Keep the text exactly as typed, empty lines included. Otherwise pressing Enter would
  // make an empty line that the clean list drops, and the cursor couldn't move down.
  const [text, setText] = useState(() => value.join("\n"));
  const [lastValue, setLastValue] = useState(value);

  // If the list is changed from outside (e.g. a new result), show the new list.
  if (value !== lastValue) {
    setLastValue(value);
    if (!sameItems(value, toItems(text))) setText(value.join("\n"));
  }

  return (
    <TextArea
      {...props}
      hint={hint}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(toItems(event.target.value));
      }}
    />
  );
}
