"use client";

import { HelpTip } from "@/components/HelpTip";
import {
  CATALOG,
  catalogCategories,
  defaultParams,
  getCatalogByType,
} from "@/lib/catalog";
import { formatRub, sumLines, withMargin } from "@/lib/line-engine";
import {
  CATEGORY_LABELS,
  CONFIDENCE_LABELS,
  UNIT_LABELS,
  type Confidence,
} from "@/lib/types";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

interface CartItem {
  id: string;
  itemType: string;
  name: string;
  params: string;
  sortOrder: number;
}

interface Line {
  id: string;
  cartItemId: string | null;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  enabled: boolean;
  helpKey?: string | null;
  note: string;
  source: string;
}

interface Version {
  id: string;
  kind: string;
  label: string;
  total: number;
  confidence: string;
  createdAt: string;
}

interface Project {
  id: string;
  clientName: string;
  objectName: string;
  notes: string;
  marginPercent: number;
  cartItems: CartItem[];
  lines: Line[];
  versions: Version[];
}

interface ChecklistRow {
  ruleId: string;
  label: string;
  detail: string;
  status: "ok" | "missing" | "skipped";
}

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const [category, setCategory] = useState("kitchen");
  const [itemType, setItemType] = useState("kitchen_base");
  const [params, setParams] = useState<Record<string, string | number | boolean>>(
    defaultParams("kitchen_base"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<string | null>(null);

  const typesInCategory = useMemo(
    () => CATALOG.filter((c) => c.category === category),
    [category],
  );
  const def = getCatalogByType(itemType);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Ошибка загрузки");
      return;
    }
    setProject(data.project);
    const ch = await fetch(`/api/projects/${projectId}/checklist`);
    const chData = await ch.json();
    setChecklist(chData.checklist ?? []);
    setConfidence(chData.confidence ?? "medium");
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const first = CATALOG.find((c) => c.category === category);
    if (first) {
      setItemType(first.type);
      setParams(defaultParams(first.type));
    }
  }, [category]);

  useEffect(() => {
    setParams(defaultParams(itemType));
  }, [itemType]);

  async function saveMeta(patch: Partial<Project>) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.project) setProject(data.project);
  }

  async function addToCart() {
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, params }),
    });
    if (!res.ok) {
      setMessage("Не удалось добавить предмет");
      return;
    }
    setMessage("Предмет добавлен в корзину");
    await load();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/projects/${projectId}/items/${itemId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function patchLine(lineId: string, patch: Partial<Line>) {
    await fetch(`/api/projects/${projectId}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, patch }),
    });
    await load();
  }

  async function addManualLine() {
    await fetch(`/api/projects/${projectId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ручная статья", unitPrice: 0 }),
    });
    await load();
  }

  async function deleteLine(lineId: string) {
    await fetch(`/api/projects/${projectId}/lines?lineId=${lineId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function setChecklistStatus(
    ruleId: string,
    status: ChecklistRow["status"],
  ) {
    await fetch(`/api/projects/${projectId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId, status }),
    });
    await load();
  }

  async function saveVersion(kind: "DRAFT" | "CLIENT") {
    await fetch(`/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setMessage(kind === "CLIENT" ? "Сохранена клиентская версия" : "Черновик сохранён");
    await load();
  }

  async function download(path: string, filenameHint: string) {
    const res = await fetch(path, { method: "POST" });
    if (!res.ok) {
      setMessage("Ошибка экспорта");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameHint;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(
    file: File,
    kind: "csv" | "pdf",
    apply: boolean,
  ) {
    const form = new FormData();
    form.append("file", file);
    if (apply) form.append("apply", "1");
    const res = await fetch(
      `/api/projects/${projectId}/import/${kind}`,
      { method: "POST", body: form },
    );
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Ошибка импорта");
      return;
    }
    if (!apply) {
      setImportPreview(JSON.stringify(data.preview, null, 2));
      setMessage("Превью импорта готово — проверьте и нажмите «Применить» тем же файлом.");
      // stash file name for UX — user re-selects to apply
      (window as unknown as { __importFile?: File }).__importFile = file;
      return;
    }
    setImportPreview(null);
    setMessage("Импорт применён");
    await load();
  }

  const lineGroups = useMemo(() => {
    if (!project) return [];
    const buckets = new Map<string | null, Line[]>();
    for (const item of project.cartItems) buckets.set(item.id, []);
    buckets.set(null, []);
    for (const line of project.lines) {
      const key =
        line.cartItemId && buckets.has(line.cartItemId)
          ? line.cartItemId
          : line.cartItemId
            ? line.cartItemId
            : null;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(line);
    }

    const groups: Array<{
      id: string | null;
      title: string;
      subtitle?: string;
      lines: Line[];
      subtotal: number;
    }> = [];

    for (const item of project.cartItems) {
      const lines = buckets.get(item.id) ?? [];
      if (!lines.length) continue;
      const subtotal = lines
        .filter((l) => l.enabled)
        .reduce((a, l) => a + l.quantity * l.unitPrice, 0);
      groups.push({
        id: item.id,
        title: item.name,
        subtitle: item.itemType,
        lines,
        subtotal,
      });
    }

    for (const [id, lines] of buckets) {
      if (!id || project.cartItems.some((c) => c.id === id)) continue;
      if (!lines.length) continue;
      const subtotal = lines
        .filter((l) => l.enabled)
        .reduce((a, l) => a + l.quantity * l.unitPrice, 0);
      groups.push({
        id,
        title: "Связанный предмет",
        lines,
        subtotal,
      });
    }

    const common = buckets.get(null) ?? [];
    if (common.length) {
      const subtotal = common
        .filter((l) => l.enabled)
        .reduce((a, l) => a + l.quantity * l.unitPrice, 0);
      groups.push({
        id: null,
        title: "Общие статьи проекта",
        subtitle: "доставка, монтаж, ручные позиции",
        lines: common,
        subtotal,
      });
    }
    return groups;
  }, [project]);

  if (!project) {
    return <p className="text-stone-600">Загрузка проекта…</p>;
  }

  const totals = withMargin(sumLines(project.lines), project.marginPercent);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/projects" className="text-sm text-teal-800 underline">
            ← Все проекты
          </Link>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl">
            {project.objectName}
          </h1>
          <p className="text-stone-600">{project.clientName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() =>
              void download(
                `/api/projects/${projectId}/export/excel`,
                `smeta-internal.xlsx`,
              )
            }
          >
            Excel внутрь
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() =>
              void fetch(`/api/projects/${projectId}/export/excel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "client" }),
              }).then(async (res) => {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "smeta-client.xlsx";
                a.click();
              })
            }
          >
            Excel клиенту
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() =>
              void download(
                `/api/projects/${projectId}/export/pdf`,
                `smeta.pdf`,
              )
            }
          >
            PDF клиенту
          </button>
          <button
            type="button"
            className="rounded-md bg-stone-900 px-3 py-2 text-sm text-white"
            onClick={() => void saveVersion("CLIENT")}
          >
            Версия клиенту
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
          {message}
        </p>
      )}

      <section className="grid gap-3 rounded-xl border border-stone-300 bg-white/80 p-4 md:grid-cols-4">
        <label className="text-sm">
          Клиент
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={project.clientName}
            onChange={(e) =>
              setProject({ ...project, clientName: e.target.value })
            }
            onBlur={() => void saveMeta({ clientName: project.clientName })}
          />
        </label>
        <label className="text-sm">
          Объект
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={project.objectName}
            onChange={(e) =>
              setProject({ ...project, objectName: e.target.value })
            }
            onBlur={() => void saveMeta({ objectName: project.objectName })}
          />
        </label>
        <label className="text-sm">
          Наценка, %
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={project.marginPercent}
            onChange={(e) =>
              setProject({
                ...project,
                marginPercent: Number(e.target.value) || 0,
              })
            }
            onBlur={() =>
              void saveMeta({ marginPercent: project.marginPercent })
            }
          />
        </label>
        <label className="text-sm md:col-span-1">
          Заметки
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={project.notes}
            onChange={(e) => setProject({ ...project, notes: e.target.value })}
            onBlur={() => void saveMeta({ notes: project.notes })}
          />
        </label>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-300 bg-[#faf7f1] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Добавить в корзину
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Категория
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {catalogCategories().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Предмет
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              >
                {typesInCategory.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-stone-600">{def?.description}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {def?.fields.map((field) => (
              <label key={field.key} className="text-sm">
                {field.label}
                {field.type === "boolean" ? (
                  <input
                    type="checkbox"
                    className="ml-2"
                    checked={Boolean(params[field.key])}
                    onChange={(e) =>
                      setParams({ ...params, [field.key]: e.target.checked })
                    }
                  />
                ) : field.type === "select" ? (
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={String(params[field.key] ?? "")}
                    onChange={(e) =>
                      setParams({ ...params, [field.key]: e.target.value })
                    }
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    step={field.step}
                    min={field.min}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={String(params[field.key] ?? "")}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        [field.key]:
                          field.type === "number"
                            ? Number(e.target.value) || 0
                            : e.target.value,
                      })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void addToCart()}
            className="mt-4 rounded-md bg-teal-800 px-4 py-2 text-white"
          >
            В корзину
          </button>
        </div>

        <div className="rounded-xl border border-stone-300 bg-white p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Корзина предметов
          </h2>
          <ul className="mt-3 space-y-2">
            {project.cartItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-sm"
              >
                <span>
                  <b>{item.name}</b>
                  <span className="text-stone-500"> · {item.itemType}</span>
                </span>
                <button
                  type="button"
                  className="text-red-700"
                  onClick={() => void removeItem(item.id)}
                >
                  Удалить
                </button>
              </li>
            ))}
            {!project.cartItems.length && (
              <li className="text-sm text-stone-500">Пока пусто</li>
            )}
          </ul>

          <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
            <p className="font-medium">Импорт</p>
            <label className="block">
              CSV / Excel / PRO100
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="mt-1 block w-full"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportFile(f, "csv", false);
                }}
              />
            </label>
            <label className="block">
              PDF дизайнера
              <input
                type="file"
                accept=".pdf"
                className="mt-1 block w-full"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportFile(f, "pdf", false);
                }}
              />
            </label>
            {importPreview && (
              <>
                <pre className="max-h-40 overflow-auto rounded bg-stone-100 p-2 text-xs">
                  {importPreview}
                </pre>
                <button
                  type="button"
                  className="rounded-md bg-stone-900 px-3 py-2 text-white"
                  onClick={() => {
                    const f = (window as unknown as { __importFile?: File })
                      .__importFile;
                    if (!f) {
                      setMessage("Снова выберите файл для применения");
                      return;
                    }
                    const kind = f.name.toLowerCase().endsWith(".pdf")
                      ? "pdf"
                      : "csv";
                    void onImportFile(f, kind, true);
                  }}
                >
                  Применить импорт
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-300 bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Статьи сметы
          </h2>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => void addManualLine()}
          >
            + Ручная статья
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="px-3 py-2">Вкл</th>
                <th className="px-3 py-2">Категория</th>
                <th className="px-3 py-2">Наименование</th>
                <th className="px-3 py-2">Кол-во</th>
                <th className="px-3 py-2">Цена</th>
                <th className="px-3 py-2">Сумма</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lineGroups.map((group) => (
                <Fragment key={group.id ?? "common"}>
                  <tr className="border-t border-stone-300 bg-[#ebe4d8]">
                    <td colSpan={7} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-[family-name:var(--font-display)] text-base text-stone-900">
                            {group.title}
                          </span>
                          {group.subtitle && (
                            <span className="ml-2 text-xs text-stone-500">
                              {group.subtitle}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-stone-800">
                          Подытог: {formatRub(group.subtotal)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {group.lines.map((line) => {
                    const displayName = group.title
                      ? line.name.replace(
                          new RegExp(
                            `^${group.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`,
                          ),
                          "",
                        )
                      : line.name;
                    return (
                      <tr
                        key={line.id}
                        className={`border-t border-stone-100 ${line.enabled ? "" : "opacity-50"}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={line.enabled}
                            onChange={(e) =>
                              void patchLine(line.id, {
                                enabled: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          {CATEGORY_LABELS[
                            line.category as keyof typeof CATEGORY_LABELS
                          ] ?? line.category}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <input
                              className="w-full min-w-48 rounded border px-2 py-1"
                              value={displayName}
                              onChange={(e) => {
                                const nextName =
                                  group.id != null
                                    ? `${group.title}: ${e.target.value}`
                                    : e.target.value;
                                setProject({
                                  ...project,
                                  lines: project.lines.map((l) =>
                                    l.id === line.id
                                      ? { ...l, name: nextName }
                                      : l,
                                  ),
                                });
                              }}
                              onBlur={(e) => {
                                const nextName =
                                  group.id != null
                                    ? `${group.title}: ${e.target.value}`
                                    : e.target.value;
                                void patchLine(line.id, { name: nextName });
                              }}
                            />
                            <HelpTip helpKey={line.helpKey} />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 rounded border px-2 py-1"
                            value={line.quantity}
                            onChange={(e) =>
                              void patchLine(line.id, {
                                quantity: Number(e.target.value) || 0,
                              })
                            }
                          />
                          <span className="ml-1 text-xs text-stone-500">
                            {UNIT_LABELS[
                              line.unit as keyof typeof UNIT_LABELS
                            ] ?? line.unit}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-24 rounded border px-2 py-1"
                            value={line.unitPrice}
                            onChange={(e) =>
                              void patchLine(line.id, {
                                unitPrice: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatRub(
                            line.enabled
                              ? line.quantity * line.unitPrice
                              : 0,
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-red-700"
                            onClick={() => void deleteLine(line.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-stone-200 bg-stone-50">
                    <td
                      colSpan={5}
                      className="px-3 py-2 text-right text-xs uppercase tracking-wide text-stone-500"
                    >
                      Итого по блоку
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-stone-900">
                      {formatRub(group.subtotal)}
                    </td>
                    <td />
                  </tr>
                </Fragment>
              ))}
              {!lineGroups.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-stone-500"
                  >
                    Добавьте предметы в корзину — здесь появятся статьи.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-stone-800 bg-stone-900 p-5 text-stone-50 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-stone-400">Материалы и работы</p>
          <p className="text-lg">{formatRub(totals.subtotal)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-stone-400">
            Наценка {project.marginPercent}%
          </p>
          <p className="text-lg">{formatRub(totals.margin)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-stone-400">Итого</p>
          <p className="text-lg text-teal-300">{formatRub(totals.total)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-stone-400">Точность</p>
          <p className="text-sm">{CONFIDENCE_LABELS[confidence]}</p>
        </div>
      </section>

      <section className="rounded-xl border border-stone-300 bg-white p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Чеклист самопроверки
        </h2>
        <ul className="mt-3 space-y-2">
          {checklist.map((c) => (
            <li
              key={c.ruleId}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                c.status === "missing"
                  ? "border-amber-300 bg-amber-50"
                  : c.status === "ok"
                    ? "border-teal-200 bg-teal-50"
                    : "border-stone-200 bg-stone-50"
              }`}
            >
              <div>
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-stone-600">{c.detail}</p>
              </div>
              <div className="flex gap-1">
                {(["ok", "missing", "skipped"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${
                      c.status === s ? "bg-stone-900 text-white" : "border"
                    }`}
                    onClick={() => void setChecklistStatus(c.ruleId, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {!!project.versions.length && (
        <section className="rounded-xl border border-stone-300 bg-white p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Версии сметы
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {project.versions.map((v) => (
              <li key={v.id}>
                {v.label} · {v.kind} · {formatRub(v.total)} ·{" "}
                {new Date(v.createdAt).toLocaleString("ru-RU")}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 rounded-md border px-3 py-1.5 text-sm"
            onClick={() => void saveVersion("DRAFT")}
          >
            Сохранить черновик
          </button>
        </section>
      )}
    </div>
  );
}
