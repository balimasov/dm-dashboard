import { useLayoutEffect, useRef } from "react";

export { Field, inputCls, groupInputCls } from "@/components/ui/Field";

export const addBtnCls = "text-xs text-sky-400 hover:underline";

/**
 * A single-line-by-default `<textarea>` that grows to fit its content
 * instead of scrolling or truncating — the trait name/description fields
 * often hold 2-5 sentences, which a fixed-height `<input>` hid past its
 * visible edge with no way to see or edit the rest without scrolling
 * sideways inside the box. Height is recalculated (via `scrollHeight`, the
 * standard auto-grow trick) on every value change, so it still sits flush
 * on one row when short and only grows the rows below it as needed —
 * `items-start` on the row keeps neighboring fields (the group select, the
 * remove button) anchored to the first line instead of stretching with it.
 */
export function AutoGrowTextarea({
  className,
  value,
  onChange,
  placeholder,
}: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`resize-none overflow-hidden leading-snug ${className ?? ""}`}
    />
  );
}
