"use client";

import { HelpTip } from "@/components/HelpTip";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/types";
import { useEffect, useState } from "react";

interface Price {
  id: string;
  key: string;
  category: string;
  name: string;
  unit: string;
  price: number;
  helpKey?: string | null;
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/prices");
    const data = await res.json();
    setPrices(data.prices ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function resetDemo() {
    await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-demo" }),
    });
    setMessage("Демо-прайс восстановлен");
    await load();
  }

  async function patch(id: string, patch: Partial<Price>) {
    await fetch("/api/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    await load();
  }

  async function onImport(file: File) {
    const text = await file.text();
    // reuse project import preview path via prices action through papaparse on server:
    // simplest: POST items from client parse of CSV header price/name
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      setMessage("Пустой файл");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (names: string[]) =>
      headers.findIndex((h) => names.some((n) => h.includes(n)));
    const nameI = idx(["name", "название"]);
    const priceI = idx(["price", "цена"]);
    const catI = idx(["category", "категор"]);
    const unitI = idx(["unit", "ед"]);
    const items = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      return {
        name: cols[nameI] || "Позиция",
        price: Number(cols[priceI] || 0),
        category: cols[catI] || "other",
        unit: cols[unitI] || "pcs",
      };
    });
    await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", items }),
    });
    setMessage(`Импортировано: ${items.length}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Прайсы
        </h1>
        <p className="text-sm text-stone-600">
          Ваши цены для автострок сметы. Можно импортировать CSV.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => void resetDemo()}
        >
          Сбросить демо
        </button>
        <label className="rounded-md bg-stone-900 px-3 py-2 text-sm text-white">
          Импорт CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
            }}
          />
        </label>
      </div>
      {message && <p className="text-sm text-teal-800">{message}</p>}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-100">
            <tr>
              <th className="px-3 py-2">Категория</th>
              <th className="px-3 py-2">Название</th>
              <th className="px-3 py-2">Ед.</th>
              <th className="px-3 py-2">Цена</th>
              <th className="px-3 py-2">key</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  {CATEGORY_LABELS[
                    p.category as keyof typeof CATEGORY_LABELS
                  ] ?? p.category}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center">
                    <input
                      className="min-w-48 rounded border px-2 py-1"
                      value={p.name}
                      onChange={(e) =>
                        setPrices((prev) =>
                          prev.map((x) =>
                            x.id === p.id ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      onBlur={(e) => void patch(p.id, { name: e.target.value })}
                    />
                    <HelpTip helpKey={p.helpKey} />
                  </span>
                </td>
                <td className="px-3 py-2">
                  {UNIT_LABELS[p.unit as keyof typeof UNIT_LABELS] ?? p.unit}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-28 rounded border px-2 py-1"
                    value={p.price}
                    onChange={(e) =>
                      void patch(p.id, { price: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-stone-500">
                  {p.key}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
