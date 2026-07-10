"use client";

import { useState } from "react";

/**
 * A number input that tracks its own raw text while focused instead of
 * mirroring `Number(value) || 0` straight back into the DOM on every
 * keystroke — a plain controlled `<input type="number">` snaps an emptied
 * field to "0" the instant it's cleared, so retyping means deleting that
 * stray "0" first. Here, clearing the field just stays empty (parent state
 * isn't touched until a full number is typed or the field blurs), and only
 * blur normalizes an empty/partial value back to a real number.
 */
export function NumberInput({
  value,
  onChange,
  className,
  min,
  max,
  placeholder,
  selectOnFocus,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Selects the whole value on focus — for fields typically replaced wholesale (e.g. HP) rather than appended to. */
  selectOnFocus?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(String(value));
  }

  function clamp(n: number): number {
    let result = n;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      className={className}
      value={text}
      onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^-?\d*$/.test(raw)) return;
        setText(raw);
        if (raw !== "" && raw !== "-") onChange(clamp(Number(raw)));
      }}
      onBlur={() => {
        const normalized = clamp(Number(text) || 0);
        setText(String(normalized));
        onChange(normalized);
      }}
    />
  );
}
