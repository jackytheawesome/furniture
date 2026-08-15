"use client";

import { useApp } from "@/context/AppState";
import { DEMO_PRICES } from "@/lib/demo-prices";
import { pricesToCsv } from "@/lib/import-prices";
import {
  CATEGORY_LABELS,
  UNIT_LABELS,
  type PriceCategory,
  type PriceItem,
  type PriceUnit,
} from "@/lib/types";
import { HelpTip } from "@/components/HelpTip";
import { useRef, useState } from "react";

export function PricesWorkspace() {
  const { ready, prices, setPrices, resetDemo } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) return <p className="text-stone-600">Загрузка…</p>;

  async function onImport(file: File) {
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import-prices", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        items?: PriceItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Ошибка импорта");
      if (!data.items?.length) throw new Error("В файле не найдено строк прайса");
      setPrices(data.items);
      setMessage(`Импортировано позиций: ${data.items.length}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ошибка импорта");
    }
  }

  function downloadTemplate() {
    const csv = pricesToCsv(DEMO_PRICES);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "price-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function patchPrice(id: string, patch: Partial<PriceItem>) {
    setPrices(prices.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPrice() {
    setPrices([
      ...prices,
      {
        id: `custom-${Date.now()}`,
        category: "other",
        name: "Новая позиция",
        unit: "pcs",
        price: 0,
      },
    ]);
  }

  function removePrice(id: string) {
    setPrices(prices.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-300 bg-white/80 p-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
          Справочник прайсов
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Сейчас стоят демо-цены. Импортируйте свой CSV/Excel (колонки: id,
          category, name, unit, price) или правьте вручную. После импорта
          быстрая смета пересоберётся по новым ценам.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-stone-900 px-3 py-2 text-sm text-white"
            onClick={() => fileRef.current?.click()}
          >
            Импорт CSV / Excel
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onClick={downloadTemplate}
          >
            Скачать шаблон CSV
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onClick={addPrice}
          >
            + Позиция
          </button>
          <button
            type="button"
            className="rounded-md border border-amber-300 px-3 py-2 text-sm text-amber-900"
            onClick={() => {
              resetDemo();
              setMessage("Восстановлен демо-прайс и пример сметы");
            }}
          >
            Сбросить демо
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-teal-800">{message}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-300 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-3 py-2">Категория</th>
              <th className="px-3 py-2">Название</th>
              <th className="px-3 py-2">Ед.</th>
              <th className="px-3 py-2">Цена, ₽</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-stone-200 px-1 py-1"
                    value={p.category}
                    onChange={(e) =>
                      patchPrice(p.id, {
                        category: e.target.value as PriceCategory,
                      })
                    }
                  >
                    {(
                      Object.keys(CATEGORY_LABELS) as Array<
                        keyof typeof CATEGORY_LABELS
                      >
                    )
                      .filter((k) => k !== "margin")
                      .map((k) => (
                        <option key={k} value={k}>
                          {CATEGORY_LABELS[k]}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      className="w-full min-w-48 rounded border border-stone-200 px-2 py-1"
                      value={p.name}
                      onChange={(e) =>
                        patchPrice(p.id, { name: e.target.value })
                      }
                    />
                    <HelpTip helpKey={p.helpKey} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-stone-200 px-1 py-1"
                    value={p.unit}
                    onChange={(e) =>
                      patchPrice(p.id, { unit: e.target.value as PriceUnit })
                    }
                  >
                    {(["m2", "lm", "pcs", "set", "job"] as PriceUnit[]).map(
                      (u) => (
                        <option key={u} value={u}>
                          {UNIT_LABELS[u]}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-28 rounded border border-stone-200 px-2 py-1"
                    value={p.price}
                    onChange={(e) =>
                      patchPrice(p.id, {
                        price: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-stone-500">
                  {p.id}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-stone-500 hover:text-red-700"
                    onClick={() => removePrice(p.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
