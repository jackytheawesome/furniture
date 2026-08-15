import Papa from "papaparse";
import type { PriceCategory, PriceItem, PriceUnit } from "./types";

const CATEGORIES: PriceCategory[] = [
  "board",
  "facade",
  "edge",
  "hardware",
  "countertop",
  "labor",
  "other",
];

const UNITS: PriceUnit[] = ["m2", "lm", "pcs", "set", "job"];

function slugId(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `import-${base || "item"}-${index}`;
}

function parseCategory(value: string | undefined): PriceCategory {
  const v = (value ?? "other").trim().toLowerCase();
  if (CATEGORIES.includes(v as PriceCategory)) return v as PriceCategory;
  const map: Record<string, PriceCategory> = {
    плита: "board",
    корпус: "board",
    фасад: "facade",
    кромка: "edge",
    фурнитура: "hardware",
    столешница: "countertop",
    работа: "labor",
    работы: "labor",
  };
  return map[v] ?? "other";
}

function parseUnit(value: string | undefined): PriceUnit {
  const v = (value ?? "pcs").trim().toLowerCase();
  if (UNITS.includes(v as PriceUnit)) return v as PriceUnit;
  const map: Record<string, PriceUnit> = {
    "м2": "m2",
    "м²": "m2",
    "m²": "m2",
    "п.м.": "lm",
    "п.м": "lm",
    "пог.м": "lm",
    шт: "pcs",
    "шт.": "pcs",
    компл: "set",
    "компл.": "set",
    услуга: "job",
  };
  return map[v] ?? "pcs";
}

function rowToItem(
  row: Record<string, string>,
  index: number,
): PriceItem | null {
  const name =
    row.name || row["название"] || row["Название"] || row["Name"] || "";
  if (!name.trim()) return null;
  const priceRaw =
    row.price || row["цена"] || row["Цена"] || row["Price"] || "0";
  const price = Number(String(priceRaw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(price)) return null;

  return {
    id: row.id?.trim() || slugId(name, index),
    category: parseCategory(
      row.category || row["категория"] || row["Категория"],
    ),
    name: name.trim(),
    unit: parseUnit(row.unit || row["ед"] || row["Ед"] || row["единица"]),
    price,
    note: row.note || row["заметка"] || row["Примечание"] || undefined,
    helpKey: row.helpKey || row["help"] || undefined,
  };
}

export function parsePricesCsv(text: string): PriceItem[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const items: PriceItem[] = [];
  result.data.forEach((row, i) => {
    const item = rowToItem(row, i);
    if (item) items.push(item);
  });
  return items;
}

/** Импорт из xlsx через ExcelJS (динамический import). */
export async function parsePricesXlsx(buffer: ArrayBuffer): Promise<PriceItem[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const rows: Record<string, string>[] = [];
  let headers: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    const values = row.values as Array<string | number | undefined>;
    const cells = values.slice(1).map((v) => String(v ?? "").trim());
    if (rowNumber === 1) {
      headers = cells.map((h) => h.toLowerCase());
      return;
    }
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
      // also keep original-ish keys for RU headers
      if (h === "название") obj.name = cells[i] ?? "";
      if (h === "цена") obj.price = cells[i] ?? "";
      if (h === "категория") obj.category = cells[i] ?? "";
      if (h === "ед" || h === "единица") obj.unit = cells[i] ?? "";
    });
    rows.push(obj);
  });

  const items: PriceItem[] = [];
  rows.forEach((row, i) => {
    const item = rowToItem(row, i);
    if (item) items.push(item);
  });
  return items;
}

export function pricesToCsv(prices: PriceItem[]): string {
  return Papa.unparse(
    prices.map((p) => ({
      id: p.id,
      category: p.category,
      name: p.name,
      unit: p.unit,
      price: p.price,
      note: p.note ?? "",
      helpKey: p.helpKey ?? "",
    })),
  );
}
