"use client";

import { getGlossary } from "@/lib/glossary";
import { useState } from "react";

export function HelpTip({ helpKey }: { helpKey?: string }) {
  const [open, setOpen] = useState(false);
  const entry = getGlossary(helpKey);
  if (!entry) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 text-xs text-stone-600 hover:bg-stone-200"
        aria-label={`Подсказка: ${entry.title}`}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-80 rounded-lg border border-stone-300 bg-white p-3 text-left text-xs shadow-lg">
          <p className="mb-2 font-semibold text-stone-900">{entry.title}</p>
          <p className="mb-1 text-stone-700">
            <span className="font-medium">Что:</span> {entry.what}
          </p>
          <p className="mb-1 text-stone-700">
            <span className="font-medium">Где:</span> {entry.where}
          </p>
          <p className="mb-1 text-stone-700">
            <span className="font-medium">Зачем:</span> {entry.why}
          </p>
          <p className="text-teal-900">
            <span className="font-medium">Как сэкономить:</span> {entry.save}
          </p>
          <button
            type="button"
            className="mt-2 text-stone-500 underline"
            onClick={() => setOpen(false)}
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}
