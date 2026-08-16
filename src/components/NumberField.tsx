"use client";

import { useEffect, useState } from "react";

type NumberFieldProps = {
  value: number;
  onChange: (value: number) => void;
  /** Called once on blur with the committed number. */
  onCommit?: (value: number) => void;
  className?: string;
  /** Update parent while typing when draft is a finite number. Default: only on blur. */
  live?: boolean;
};

/**
 * Number input that allows clearing without snapping to 0 mid-edit
 * (avoids "030" when replacing a value).
 */
export function NumberField({
  value,
  onChange,
  onCommit,
  className,
  live = false,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  function parse(raw: string): number {
    const trimmed = raw.trim();
    if (
      trimmed === "" ||
      trimmed === "-" ||
      trimmed === "." ||
      trimmed === "-."
    ) {
      return 0;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : 0;
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={focused ? draft : String(value)}
      onFocus={(e) => {
        setFocused(true);
        setDraft(String(value));
        e.target.select();
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        if (!live) return;
        if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        const next = parse(draft);
        setDraft(String(next));
        onChange(next);
        onCommit?.(next);
      }}
    />
  );
}
