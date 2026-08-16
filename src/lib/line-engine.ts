import { facadeKey, getCatalogByType, num, bool } from "./catalog";
import type { LineCategory, PriceUnit } from "./types";

export interface PriceMap {
  [key: string]: { name: string; unit: PriceUnit; price: number; category: string; helpKey?: string | null };
}

export interface DraftLine {
  category: LineCategory;
  name: string;
  quantity: number;
  unit: PriceUnit;
  unitPrice: number;
  enabled: boolean;
  helpKey?: string;
  note?: string;
  source: "auto" | "manual" | "import";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mmToM(mm: number): number {
  return mm / 1000;
}

function priceOf(prices: PriceMap, key: string) {
  return prices[key];
}

function pushPrice(
  lines: DraftLine[],
  prices: PriceMap,
  key: string,
  qty: number,
  nameOverride?: string,
) {
  if (qty <= 0) return;
  const p = priceOf(prices, key);
  if (!p) return;
  lines.push({
    category: p.category as LineCategory,
    name: nameOverride ?? p.name,
    quantity: round2(qty),
    unit: p.unit,
    unitPrice: p.price,
    enabled: true,
    helpKey: p.helpKey ?? undefined,
    source: "auto",
  });
}

/** Build auto estimate lines for one cart item from catalog params. */
export function buildLinesForItem(
  itemType: string,
  itemName: string,
  params: Record<string, unknown>,
  prices: PriceMap,
): DraftLine[] {
  const lines: DraftLine[] = [];
  const w = mmToM(num(params, "widthMm", num(params, "lengthMm", 1000)));
  const h = mmToM(num(params, "heightMm", 2000));
  const d = mmToM(num(params, "depthMm", 500));
  const doors = num(params, "doors");
  const drawers = num(params, "drawers");
  const shelves = num(params, "shelves");
  const sections = Math.max(1, num(params, "sections", 1));
  const facadeType = String(params.facadeType ?? "film");
  const tipOn = bool(params, "useTipOn");
  const lighting = bool(params, "lighting");
  const antresol = bool(params, "hasAntresol");

  const prefix = `${itemName}: `;

  if (itemType === "kitchen_countertop") {
    const lengthM = mmToM(num(params, "lengthMm", 3000));
    pushPrice(lines, prices, "countertop-hpl", lengthM, prefix + "Столешница");
    const cutouts = num(params, "cutouts");
    if (cutouts > 0) {
      lines.push({
        category: "labor",
        name: prefix + `Вырезы (${cutouts})`,
        quantity: cutouts,
        unit: "pcs",
        unitPrice: 2500,
        enabled: true,
        source: "auto",
        note: "Ориентир за вырез",
      });
    }
    pushPrice(lines, prices, "labor-install", lengthM * 0.3, prefix + "Монтаж столешницы");
    return lines;
  }

  if (itemType === "kitchen_backsplash") {
    const lengthM = mmToM(num(params, "lengthMm", 3000));
    pushPrice(lines, prices, "backsplash", lengthM, prefix + "Фартук");
    return lines;
  }

  if (itemType === "wall_panel") {
    const area = w * h;
    pushPrice(lines, prices, "board-ldsp-18", area * 1.1, prefix + "Панель ЛДСП");
    pushPrice(lines, prices, "edge-2", (w + h) * 2, prefix + "Кромка панели");
    pushPrice(lines, prices, "labor-cut", area, prefix + "Раскрой панели");
    return lines;
  }

  // Generic cabinet-like body
  const boardM2 = (2 * (w * h + w * d + h * d) + shelves * w * d) * 1.12;
  const hdfM2 = w * h * 0.9;
  const facadeM2 = Math.max(doors, 1) > 0 || drawers > 0
    ? doors * (w / Math.max(doors, 1)) * h * 0.85 + drawers * (w / Math.max(sections, 1)) * 0.2
    : 0;
  const facadeArea = itemType === "desk"
    ? drawers * 0.15
    : Math.max(facadeM2, doors * 0.4 + drawers * 0.12);

  pushPrice(lines, prices, "board-ldsp-18", boardM2, prefix + "ЛДСП корпуса");
  pushPrice(lines, prices, "board-hdf", hdfM2, prefix + "ХДФ");
  if (facadeArea > 0) {
    pushPrice(lines, prices, facadeKey(facadeType), facadeArea, prefix + "Фасады");
  }
  if (antresol) {
    pushPrice(lines, prices, "board-ldsp-18", w * d * 2.2, prefix + "Антресоль (плита)");
    pushPrice(lines, prices, facadeKey(facadeType), w * 0.4, prefix + "Антресоль (фасад)");
  }

  const edgeThin = boardM2 * 3;
  const edgeThick = facadeArea * 4 + doors * 2;
  pushPrice(lines, prices, "edge-04", edgeThin, prefix + "Кромка 0,4");
  pushPrice(lines, prices, "edge-2", edgeThick, prefix + "Кромка 2 мм");

  const hinges = doors * 2 + (antresol ? 2 : 0);
  pushPrice(lines, prices, "hinge", hinges, prefix + "Петли");
  pushPrice(lines, prices, "runner", drawers, prefix + "Направляющие");
  if (tipOn) {
    pushPrice(lines, prices, "tip-on", doors + drawers, prefix + "TIP-ON");
  } else if (doors + drawers > 0) {
    pushPrice(lines, prices, "handle", doors + drawers, prefix + "Ручки");
  }

  if (itemType === "kitchen_base" || itemType === "kitchen_tall" || itemType === "cabinet") {
    pushPrice(lines, prices, "leg", Math.max(4, Math.ceil(w / 0.6) * 4), prefix + "Опоры");
    if (itemType !== "cabinet" || w > 0) {
      pushPrice(lines, prices, "plinth", w, prefix + "Цоколь");
    }
  }

  if (itemType === "kitchen_tall") {
    pushPrice(lines, prices, "tall-surcharge", 1, prefix + "Доплата пенал");
  }

  if (lighting) {
    pushPrice(lines, prices, "led", Math.max(w, 0.5), prefix + "Подсветка");
  }

  if (bool(params, "onWheels")) {
    lines.push({
      category: "hardware",
      name: prefix + "Колёсные опоры",
      quantity: 4,
      unit: "pcs",
      unitPrice: 350,
      enabled: true,
      source: "auto",
    });
  }

  pushPrice(lines, prices, "labor-cut", boardM2, prefix + "Раскрой");
  pushPrice(lines, prices, "labor-edge", edgeThin + edgeThick, prefix + "Кромление");
  pushPrice(lines, prices, "labor-assembly", Math.max(w, 0.5), prefix + "Сборка");

  if (itemType === "custom" && lines.length === 0) {
    lines.push({
      category: "other",
      name: prefix + "Базовая позиция (уточните вручную)",
      quantity: 1,
      unit: "job",
      unitPrice: 0,
      enabled: true,
      source: "manual",
      note: String(params.notes ?? ""),
    });
  }

  // Ensure catalog type exists for naming
  getCatalogByType(itemType);

  return lines;
}

export function buildProjectCommonLines(
  prices: PriceMap,
  opts: { delivery: boolean; installation: boolean; measure: boolean; risk: boolean; installLm: number },
): DraftLine[] {
  const lines: DraftLine[] = [];
  if (opts.measure) pushPrice(lines, prices, "labor-measure", 1, "Замер объекта");
  if (opts.delivery) pushPrice(lines, prices, "labor-delivery", 1, "Доставка");
  if (opts.installation) pushPrice(lines, prices, "labor-install", Math.max(opts.installLm, 1), "Монтаж на объекте");
  if (opts.risk) pushPrice(lines, prices, "risk-buffer", 1, "Запас на риски");
  return lines;
}

export function sumLines(
  lines: { quantity: number; unitPrice: number; enabled: boolean }[],
): number {
  return round2(
    lines.filter((l) => l.enabled).reduce((a, l) => a + l.quantity * l.unitPrice, 0),
  );
}

export function withMargin(subtotal: number, marginPercent: number): {
  subtotal: number;
  margin: number;
  total: number;
} {
  const margin = round2((subtotal * marginPercent) / 100);
  return { subtotal, margin, total: round2(subtotal + margin) };
}

export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}
