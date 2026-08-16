"use client";

import { formatRub } from "@/lib/line-engine";
import { UNIT_LABELS } from "@/lib/types";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PricePickOption = {
  id: string;
  key: string;
  name: string;
  unit: string;
  price: number;
  category?: string;
  note?: string | null;
  helpKey?: string | null;
};

type PriceComboboxProps = {
  options: PricePickOption[];
  /** Current visible label (without item prefix). */
  label: string;
  placeholder?: string;
  className?: string;
  onSelect: (option: PricePickOption) => void;
  onLabelChange?: (label: string) => void;
  onLabelBlur?: (label: string) => void;
};

export function PriceCombobox({
  options,
  label,
  placeholder = "Поиск материала…",
  className,
  onSelect,
  onLabelChange,
  onLabelBlur,
}: PriceComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(label);

  useEffect(() => {
    setQuery(label);
  }, [label]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? options
      : options.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            (p.note ?? "").toLowerCase().includes(q),
        );
    return list.slice(0, 40);
  }, [options, query]);

  return (
    <div ref={rootRef} className={`relative min-w-48 flex-1 ${className ?? ""}`}>
      <input
        className="w-full rounded border px-2 py-1"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onLabelChange?.(e.target.value);
        }}
        onBlur={() => onLabelBlur?.(query)}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full min-w-[20rem] overflow-auto rounded-md border border-stone-200 bg-white shadow-lg"
        >
          {matches.map((p) => (
            <li key={p.id} role="option">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(p.name);
                  setOpen(false);
                  onSelect(p);
                }}
              >
                <span>
                  <span className="font-medium text-stone-900">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {UNIT_LABELS[p.unit as keyof typeof UNIT_LABELS] ?? p.unit}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-stone-700">
                  {formatRub(p.price)}
                </span>
              </button>
            </li>
          ))}
          {!matches.length && (
            <li className="px-3 py-3 text-sm text-stone-500">Ничего не найдено</li>
          )}
        </ul>
      )}
    </div>
  );
}
