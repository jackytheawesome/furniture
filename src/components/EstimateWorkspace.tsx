"use client";

import { useApp } from "@/context/AppState";
import { HelpTip } from "@/components/HelpTip";
import {
  formatRub,
  grandTotal,
  lineTotal,
  marginAmount,
  roughOrder,
  sumEnabledLines,
} from "@/lib/estimate-engine";
import {
  CATEGORY_LABELS,
  FACADE_LABELS,
  UNIT_LABELS,
  type FacadeType,
  type PriceCategory,
  type PriceUnit,
} from "@/lib/types";
import { useState } from "react";

const FACADE_OPTIONS = Object.entries(FACADE_LABELS) as [FacadeType, string][];

export function EstimateWorkspace() {
  const {
    ready,
    project,
    setProjectMeta,
    setQuickInput,
    rebuildQuick,
    patchLine,
    addLine,
    deleteLine,
    switchToDetailed,
    switchToQuick,
  } = useApp();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) {
    return <p className="text-stone-600">Загрузка…</p>;
  }

  const subtotal = sumEnabledLines(project.lines);
  const margin = marginAmount(project.lines, project.marginPercent);
  const total = grandTotal(project.lines, project.marginPercent);
  const rough = roughOrder(total);

  async function onExport() {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, includeInternal: true }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error || "Не удалось сформировать Excel");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smeta-${project.objectName.replace(/\s+/g, "-")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Excel скачан: лист «Клиенту» + «Внутреннее» + «Подсказки».");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Не удалось сформировать Excel",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-xl border border-stone-300 bg-white/80 p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-stone-600">Клиент</span>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={project.clientName}
            onChange={(e) => setProjectMeta({ clientName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Объект</span>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={project.objectName}
            onChange={(e) => setProjectMeta({ objectName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Наценка, %</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={project.marginPercent}
            onChange={(e) =>
              setProjectMeta({ marginPercent: Number(e.target.value) || 0 })
            }
          />
        </label>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={switchToQuick}
          className={`rounded-md px-3 py-2 text-sm ${
            project.mode === "quick"
              ? "bg-teal-800 text-white"
              : "border border-stone-300 bg-white"
          }`}
        >
          Быстрая прикидка
        </button>
        <button
          type="button"
          onClick={switchToDetailed}
          className={`rounded-md px-3 py-2 text-sm ${
            project.mode === "detailed"
              ? "bg-teal-800 text-white"
              : "border border-stone-300 bg-white"
          }`}
        >
          Подробная смета
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="ml-auto rounded-md bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {exporting ? "Готовим Excel…" : "Скачать Excel"}
        </button>
      </section>

      {message && (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {message}
        </p>
      )}

      {project.mode === "quick" && (
        <section className="rounded-xl border border-stone-300 bg-[#faf7f1] p-4">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg text-stone-900">
            Параметры по рендеру / эскизу
          </h2>
          <p className="mb-4 text-sm text-stone-600">
            Введите погонные метры и комплектацию глазами по картинке — получите
            порядок цены. Потом правьте строки ниже.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Num
              label="Низ, п.м."
              value={project.quickInput.lowerLm}
              onChange={(v) => setQuickInput({ lowerLm: v })}
            />
            <Num
              label="Верх, п.м."
              value={project.quickInput.upperLm}
              onChange={(v) => setQuickInput({ upperLm: v })}
            />
            <Num
              label="Глубина корпуса, м"
              value={project.quickInput.cabinetDepthM}
              step={0.01}
              onChange={(v) => setQuickInput({ cabinetDepthM: v })}
            />
            <label className="block text-sm">
              <span className="text-stone-600">Тип фасада</span>
              <select
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                value={project.quickInput.facadeType}
                onChange={(e) =>
                  setQuickInput({
                    facadeType: e.target.value as FacadeType,
                  })
                }
              >
                {FACADE_OPTIONS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Num
              label="Дверцы, шт."
              value={project.quickInput.doorCount}
              onChange={(v) => setQuickInput({ doorCount: v })}
            />
            <Num
              label="Ящики, шт."
              value={project.quickInput.drawerCount}
              onChange={(v) => setQuickInput({ drawerCount: v })}
            />
            <Num
              label="Пеналы, шт."
              value={project.quickInput.tallUnitCount}
              onChange={(v) => setQuickInput({ tallUnitCount: v })}
            />
            <Num
              label="Ниши техники, шт."
              value={project.quickInput.applianceCount}
              onChange={(v) => setQuickInput({ applianceCount: v })}
            />
            <Num
              label="Столешница, п.м."
              value={project.quickInput.countertopLm}
              onChange={(v) => setQuickInput({ countertopLm: v })}
            />
            <Num
              label="Фартук, п.м."
              value={project.quickInput.backsplashLm}
              onChange={(v) => setQuickInput({ backsplashLm: v })}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Check
              label="Столешница"
              checked={project.quickInput.hasCountertop}
              onChange={(v) => setQuickInput({ hasCountertop: v })}
            />
            <Check
              label="Фартук"
              checked={project.quickInput.hasBacksplash}
              onChange={(v) => setQuickInput({ hasBacksplash: v })}
            />
            <Check
              label="Подсветка"
              checked={project.quickInput.lighting}
              onChange={(v) => setQuickInput({ lighting: v })}
            />
            <Check
              label="Доставка"
              checked={project.quickInput.delivery}
              onChange={(v) => setQuickInput({ delivery: v })}
            />
            <Check
              label="Монтаж"
              checked={project.quickInput.installation}
              onChange={(v) => setQuickInput({ installation: v })}
            />
          </div>
          <button
            type="button"
            onClick={rebuildQuick}
            className="mt-4 rounded-md bg-teal-800 px-4 py-2 text-sm text-white"
          >
            Пересчитать статьи из параметров
          </button>
        </section>
      )}

      {project.mode === "detailed" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Подробный режим: строки не пересобираются автоматически. Добавляйте и
          убирайте модули/статьи вручную под дизайн-проект.
        </p>
      )}

      <section className="overflow-x-auto rounded-xl border border-stone-300 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            Статьи сметы
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            + Статья
          </button>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-3 py-2">Вкл</th>
              <th className="px-3 py-2">Категория</th>
              <th className="px-3 py-2">Наименование</th>
              <th className="px-3 py-2">Кол-во</th>
              <th className="px-3 py-2">Ед.</th>
              <th className="px-3 py-2">Цена</th>
              <th className="px-3 py-2">Сумма</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {project.lines.map((line) => (
              <tr
                key={line.id}
                className={`border-t border-stone-100 ${
                  line.enabled ? "" : "opacity-50"
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={line.enabled}
                    onChange={(e) =>
                      patchLine(line.id, { enabled: e.target.checked })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="max-w-36 rounded border border-stone-200 px-1 py-1"
                    value={line.category}
                    onChange={(e) =>
                      patchLine(line.id, {
                        category: e.target.value as PriceCategory | "margin",
                      })
                    }
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      className="w-full min-w-40 rounded border border-stone-200 px-2 py-1"
                      value={line.name}
                      onChange={(e) =>
                        patchLine(line.id, { name: e.target.value })
                      }
                    />
                    <HelpTip helpKey={line.helpKey} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 rounded border border-stone-200 px-2 py-1"
                    value={line.quantity}
                    onChange={(e) =>
                      patchLine(line.id, {
                        quantity: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-stone-200 px-1 py-1"
                    value={line.unit}
                    onChange={(e) =>
                      patchLine(line.id, {
                        unit: e.target.value as PriceUnit | "%",
                      })
                    }
                  >
                    {Object.entries(UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-24 rounded border border-stone-200 px-2 py-1"
                    value={line.unitPrice}
                    onChange={(e) =>
                      patchLine(line.id, {
                        unitPrice: Number(e.target.value) || 0,
                        manualPrice: true,
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatRub(lineTotal(line))}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-stone-500 hover:text-red-700"
                    onClick={() => deleteLine(line.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-3 rounded-xl border border-stone-800 bg-stone-900 p-5 text-stone-50 md:grid-cols-4">
        <Stat label="Материалы и работы" value={formatRub(subtotal)} />
        <Stat
          label={`Наценка ${project.marginPercent}%`}
          value={formatRub(margin)}
        />
        <Stat label="Итого клиенту" value={formatRub(total)} highlight />
        <Stat label="Порядок (±100 тыс.)" value={rough.label} />
      </section>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <input
        type="number"
        step={step}
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p
        className={`mt-1 text-lg ${
          highlight ? "font-semibold text-teal-300" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
