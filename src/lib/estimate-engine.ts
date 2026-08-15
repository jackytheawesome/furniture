import { priceById } from "./demo-prices";
import type {
  EstimateLine,
  PriceItem,
  Project,
  QuickEstimateInput,
} from "./types";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function lineFromPrice(
  price: PriceItem,
  quantity: number,
  nameOverride?: string,
): EstimateLine {
  return {
    id: uid("line"),
    category: price.category,
    name: nameOverride ?? price.name,
    quantity: round2(quantity),
    unit: price.unit,
    unitPrice: price.price,
    enabled: true,
    note: price.note,
    helpKey: price.helpKey,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function lineTotal(line: EstimateLine): number {
  if (!line.enabled) return 0;
  if (line.unit === "%") return 0;
  return round2(line.quantity * line.unitPrice);
}

export function sumEnabledLines(lines: EstimateLine[]): number {
  return round2(
    lines
      .filter((l) => l.category !== "margin")
      .reduce((acc, l) => acc + lineTotal(l), 0),
  );
}

export function marginAmount(lines: EstimateLine[], marginPercent: number): number {
  return round2((sumEnabledLines(lines) * marginPercent) / 100);
}

export function grandTotal(lines: EstimateLine[], marginPercent: number): number {
  return round2(sumEnabledLines(lines) + marginAmount(lines, marginPercent));
}

/** Округление порядка цены до сотен тысяч для быстрой прикидки. */
export function roughOrder(total: number): { low: number; high: number; label: string } {
  const step = 100_000;
  const mid = Math.round(total / step) * step;
  const low = Math.max(0, mid - step);
  const high = mid + step;
  return {
    low,
    high,
    label: `${formatRub(low)} – ${formatRub(high)}`,
  };
}

export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

const FACADE_PRICE_IDS: Record<QuickEstimateInput["facadeType"], string> = {
  film: "facade-film",
  enamel: "facade-enamel",
  veneer: "facade-veneer",
  frame: "facade-frame",
};

/**
 * Быстрая прикидка: из погонных метров и комплектации собираем агрегированные статьи.
 * Формулы упрощённые (для порядка сотен тысяч ₽), не замена карт раскроя.
 */
export function buildQuickEstimateLines(
  input: QuickEstimateInput,
  prices: PriceItem[],
): EstimateLine[] {
  const depth = input.cabinetDepthM || 0.56;
  const lowerLm = Math.max(0, input.lowerLm);
  const upperLm = Math.max(0, input.upperLm);
  const totalLm = lowerLm + upperLm;

  // Корпус: приближённо 2.8 м² плиты на 1 п.м. низа и 2.2 на верх (с отходом ~12%).
  const boardM2 =
    lowerLm * 2.8 * 1.12 + upperLm * 2.2 * 1.12 + input.tallUnitCount * 4.5;
  const hdfM2 = totalLm * 0.9 + input.tallUnitCount * 1.2;

  // Фасады: высота низа ~0.72, верха ~0.72, пенал ~2.1
  const facadeM2 =
    lowerLm * 0.72 + upperLm * 0.72 + input.tallUnitCount * 2.1;

  // Кромка: грубо 8 п.м. на 1 п.м. ряда + видимая 2 мм ~40%
  const edgeThinLm = boardM2 * 3.5;
  const edgeThickLm = facadeM2 * 4.2;

  const doors = Math.max(0, input.doorCount);
  const drawers = Math.max(0, input.drawerCount);
  const hinges = doors * 2 + input.tallUnitCount * 4;
  const handles = doors + drawers + input.tallUnitCount * 2;
  const legs = Math.ceil(lowerLm / 0.6) * 4 + input.tallUnitCount * 4;

  const lines: EstimateLine[] = [];
  const add = (id: string, qty: number, name?: string) => {
    const p = priceById(prices, id);
    if (!p || qty <= 0) return;
    lines.push(lineFromPrice(p, qty, name));
  };

  add("board-ldsp-18", boardM2, "ЛДСП корпуса (с отходом)");
  add("board-hdf", hdfM2);
  add(FACADE_PRICE_IDS[input.facadeType], facadeM2);
  add("edge-04", edgeThinLm, "Кромка 0,4 мм (скрытые торцы)");
  add("edge-2", edgeThickLm, "Кромка 2 мм (видимые торцы)");
  add("hinge", hinges);
  add("runner", drawers, "Направляющие ящиков");
  add("handle", handles);
  add("leg", legs);
  add("plinth", lowerLm > 0 ? lowerLm : 0);

  if (input.hasCountertop) {
    add("countertop-hpl", Math.max(input.countertopLm, lowerLm));
  }
  if (input.hasBacksplash) {
    add(
      "backsplash",
      Math.max(input.backsplashLm, lowerLm * 0.9),
    );
  }
  if (input.lighting && upperLm > 0) {
    add("led", upperLm);
  }

  add("tall-surcharge", input.tallUnitCount);
  add("appliance-surcharge", input.applianceCount);

  add("labor-cut", boardM2);
  add("labor-edge", edgeThinLm + edgeThickLm);
  add("labor-assembly", totalLm + input.tallUnitCount * 0.6);
  if (input.delivery) add("labor-delivery", 1);
  if (input.installation) {
    add("labor-install", totalLm + input.tallUnitCount * 0.6);
  }

  // Учёт глубины: отклонение от 0.56 м
  if (Math.abs(depth - 0.56) > 0.02) {
    const factor = depth / 0.56;
    for (const line of lines) {
      if (line.category === "board" || line.category === "facade") {
        line.quantity = round2(line.quantity * factor);
        line.note = [line.note, `корр. глубины ×${factor.toFixed(2)}`]
          .filter(Boolean)
          .join("; ");
      }
    }
  }

  return lines;
}

export function createEmptyQuickInput(): QuickEstimateInput {
  return {
    lowerLm: 3.2,
    upperLm: 2.8,
    cabinetDepthM: 0.56,
    facadeType: "film",
    drawerCount: 4,
    doorCount: 8,
    tallUnitCount: 1,
    applianceCount: 2,
    hasCountertop: true,
    countertopLm: 3.2,
    hasBacksplash: true,
    backsplashLm: 3.0,
    lighting: false,
    delivery: true,
    installation: true,
  };
}

export function createDefaultProject(prices: PriceItem[]): Project {
  const quickInput = createEmptyQuickInput();
  return {
    id: uid("project"),
    clientName: "Клиент",
    objectName: "Кухня",
    mode: "quick",
    marginPercent: 25,
    quickInput,
    lines: buildQuickEstimateLines(quickInput, prices),
    updatedAt: new Date().toISOString(),
  };
}

export function recalculateQuick(project: Project, prices: PriceItem[]): Project {
  return {
    ...project,
    mode: "quick",
    lines: buildQuickEstimateLines(project.quickInput, prices),
    updatedAt: new Date().toISOString(),
  };
}

export function addBlankLine(lines: EstimateLine[]): EstimateLine[] {
  return [
    ...lines,
    {
      id: uid("line"),
      category: "other",
      name: "Новая статья",
      quantity: 1,
      unit: "pcs",
      unitPrice: 0,
      enabled: true,
      manualPrice: true,
    },
  ];
}

export function updateLine(
  lines: EstimateLine[],
  id: string,
  patch: Partial<EstimateLine>,
): EstimateLine[] {
  return lines.map((l) => (l.id === id ? { ...l, ...patch } : l));
}

export function removeLine(lines: EstimateLine[], id: string): EstimateLine[] {
  return lines.filter((l) => l.id !== id);
}
