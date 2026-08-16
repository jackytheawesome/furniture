import Papa from "papaparse";
import type { PriceCategory, PriceUnit } from "./types";

export interface ImportedCartDraft {
  itemType: string;
  name: string;
  params: Record<string, unknown>;
  note?: string;
}

export interface ImportedPriceRow {
  key?: string;
  category: string;
  name: string;
  unit: string;
  price: number;
  note?: string;
  helpKey?: string;
}

function detectPro100(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase()).join("|");
  return (
    h.includes("длина") ||
    h.includes("ширина") ||
    h.includes("толщина") ||
    h.includes("кромка") ||
    h.includes("материал")
  );
}

function toMm(v: string | number): number {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  // PRO100 often exports mm already; if value < 50 treat as meters*1000 heuristic skipped
  return n > 50 ? Math.round(n) : Math.round(n * 1000);
}

/** Smart cart import from CSV/Excel-like rows (generic or PRO100 parts list). */
export function importCartFromCsv(text: string): {
  profile: "pro100" | "generic" | "prices";
  items: ImportedCartDraft[];
  prices: ImportedPriceRow[];
} {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data;
  const headers = parsed.meta.fields ?? [];

  // Price catalog shape
  if (
    headers.some((h) => /price|цена/i.test(h)) &&
    headers.some((h) => /name|название/i.test(h)) &&
    !headers.some((h) => /длина|length/i.test(h))
  ) {
    const prices: ImportedPriceRow[] = [];
    for (const row of rows) {
      const name = row.name || row["название"] || row["Название"] || "";
      if (!name) continue;
      const price = Number(
        String(row.price || row["цена"] || row["Цена"] || "0")
          .replace(/\s/g, "")
          .replace(",", "."),
      );
      prices.push({
        key: row.id || row.key,
        category: (row.category || row["категория"] || "other").toLowerCase(),
        name,
        unit: (row.unit || row["ед"] || "pcs").toLowerCase(),
        price: Number.isFinite(price) ? price : 0,
        note: row.note || row["примечание"],
      });
    }
    return { profile: "prices", items: [], prices };
  }

  if (detectPro100(headers)) {
    const items: ImportedCartDraft[] = [];
    // Aggregate parts into one custom cabinet-ish item per material group, or one custom per part set
    let totalArea = 0;
    let count = 0;
    for (const row of rows) {
      const material =
        row["Материал"] || row["материал"] || row.Material || row.material || "";
      const length = toMm(
        row["Длина"] || row["длина"] || row.Length || row.length || 0,
      );
      const width = toMm(
        row["Ширина"] || row["ширина"] || row.Width || row.width || 0,
      );
      if (!length || !width) continue;
      totalArea += (length / 1000) * (width / 1000);
      count += 1;
      if (material) {
        // keep collecting
      }
    }
    items.push({
      itemType: "custom",
      name: `Импорт PRO100 (${count} деталей)`,
      params: {
        title: `Импорт PRO100 (${count} деталей)`,
        widthMm: 1000,
        heightMm: 2000,
        depthMm: 500,
        doors: 0,
        drawers: 0,
        shelves: 0,
        notes: `Площадь деталей ~${totalArea.toFixed(2)} м². Уточните состав вручную.`,
        facadeType: "ldsp",
      },
      note: "Черновик из списка деталей PRO100",
    });
    return { profile: "pro100", items, prices: [] };
  }

  // Generic furniture rows: name, width, height, depth, doors, drawers
  const items: ImportedCartDraft[] = [];
  for (const row of rows) {
    const name =
      row.name ||
      row["название"] ||
      row["Наименование"] ||
      row["Предмет"] ||
      "";
    if (!name.trim()) continue;
    const typeHint = (row.type || row["тип"] || row["itemType"] || "custom")
      .toLowerCase()
      .trim();
    const itemType = [
      "kitchen_base",
      "kitchen_wall",
      "kitchen_tall",
      "kitchen_countertop",
      "cabinet",
      "nightstand",
      "desk",
      "wall_panel",
      "custom",
    ].includes(typeHint)
      ? typeHint
      : "custom";

    items.push({
      itemType,
      name: name.trim(),
      params: {
        title: name.trim(),
        widthMm: Number(row.widthMm || row["ширина"] || 1000),
        heightMm: Number(row.heightMm || row["высота"] || 2000),
        depthMm: Number(row.depthMm || row["глубина"] || 500),
        lengthMm: Number(row.lengthMm || row["длина"] || 0) || undefined,
        doors: Number(row.doors || row["дверцы"] || 0),
        drawers: Number(row.drawers || row["ящики"] || 0),
        shelves: Number(row.shelves || row["полки"] || 0),
        sections: Number(row.sections || row["секции"] || 1),
        facadeType: row.facadeType || "film",
        notes: row.notes || row["описание"] || "",
      },
    });
  }

  return { profile: "generic", items, prices: [] };
}

export function normalizePriceCategory(v: string): PriceCategory {
  const x = v.toLowerCase();
  const allowed: PriceCategory[] = [
    "board",
    "facade",
    "edge",
    "hardware",
    "countertop",
    "labor",
    "other",
  ];
  if (allowed.includes(x as PriceCategory)) return x as PriceCategory;
  return "other";
}

export function normalizeUnit(v: string): PriceUnit {
  const x = v.toLowerCase();
  const allowed: PriceUnit[] = ["m2", "lm", "pcs", "set", "job"];
  if (allowed.includes(x as PriceUnit)) return x as PriceUnit;
  return "pcs";
}
