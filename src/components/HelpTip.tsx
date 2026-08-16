"use client";

import { getGlossary } from "@/lib/glossary";
import { useState } from "react";

export function HelpTip({ helpKey }: { helpKey?: string | null }) {
  const [open, setOpen] = useState(false);
  const entry = getGlossary(helpKey ?? undefined);
  if (!entry) return null;
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-80 rounded-lg border border-stone-300 bg-white p-3 text-left text-xs shadow-lg">
          <p className="mb-2 font-semibold">{entry.title}</p>
          <p className="mb-1">
            <b>Что:</b> {entry.what}
          </p>
          <p className="mb-1">
            <b>Где:</b> {entry.where}
          </p>
          <p className="mb-1">
            <b>Зачем:</b> {entry.why}
          </p>
          <p className="text-teal-900">
            <b>Сэкономить:</b> {entry.save}
          </p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => setOpen(false)}
          >
            Закрыть
          </button>
        </div>
      )}
    </span>
  );
}
