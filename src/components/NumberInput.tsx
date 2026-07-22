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
  commitOnBlur,
  deltaMode,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Selects the whole value on focus — for fields typically replaced wholesale (e.g. HP) rather than appended to. */
  selectOnFocus?: boolean;
  /**
   * Waits until blur (or Enter) to call `onChange`, instead of on every
   * keystroke — for fields that drive something highly visible elsewhere
   * (e.g. the HP bar), where updating per-keystroke means that visual
   * flickers through every intermediate value while still mid-type. The
   * typed text itself still updates immediately either way; this only
   * delays when the *parent* (and anything reading its state) finds out.
   */
  commitOnBlur?: boolean;
  /**
   * Lets a leading `+`/`-` mean "add/subtract from the current value"
   * instead of "set to this" — e.g. typing `-8` on a creature at 20 HP
   * commits 12, not a literal (and clamped-to-0) `-8`. A plain number typed
   * with no sign still replaces the value wholesale, same as always — this
   * is purely an extra way to type into the exact same field, not a second
   * input. Only meaningful for a field where a bare negative value would
   * never be a real target anyway (HP has `min: 0`), which is what makes the
   * sign unambiguous as "this is a delta" rather than "this is the number".
   */
  deltaMode?: boolean;
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

  /** `raw` still carries its typed `+`/`-` prefix here (that's what makes delta-vs-absolute unambiguous) — `Number("+3")`/`Number("-8")` parse it fine either way. */
  function resolve(raw: string): number {
    const n = Number(raw) || 0;
    if (deltaMode && (raw.startsWith("+") || raw.startsWith("-"))) return clamp(value + n);
    return clamp(n);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      title={deltaMode ? "Type a number to set it, or +N/-N to add or subtract" : undefined}
      className={className}
      value={text}
      onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
      onChange={(e) => {
        const raw = e.target.value;
        if (!(deltaMode ? /^[+-]?\d*$/ : /^-?\d*$/).test(raw)) return;
        setText(raw);
        if (!commitOnBlur && raw !== "" && raw !== "-" && raw !== "+") onChange(resolve(raw));
      }}
      onBlur={() => {
        const normalized = resolve(text);
        setText(String(normalized));
        onChange(normalized);
      }}
      onKeyDown={commitOnBlur ? (e) => e.key === "Enter" && e.currentTarget.blur() : undefined}
    />
  );
}
