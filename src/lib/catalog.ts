import type { FacadeType } from "./types";

export type FieldType = "number" | "boolean" | "select" | "text";

export interface CatalogField {
  key: string;
  label: string;
  type: FieldType;
  defaultValue: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  step?: number;
  hint?: string;
}

export interface CatalogItemDef {
  type: string;
  category: string;
  categoryLabel: string;
  label: string;
  description: string;
  fields: CatalogField[];
}

const facadeField: CatalogField = {
  key: "facadeType",
  label: "Тип фасада",
  type: "select",
  defaultValue: "film",
  options: [
    { value: "film", label: "Плёнка" },
    { value: "enamel", label: "Эмаль" },
    { value: "veneer", label: "Шпон" },
    { value: "frame", label: "Рамочный" },
    { value: "ldsp", label: "ЛДСП" },
  ],
};

export const CATALOG: CatalogItemDef[] = [
  {
    type: "kitchen_base",
    category: "kitchen",
    categoryLabel: "Кухня",
    label: "Шкаф нижний",
    description: "Нижний кухонный модуль",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 600, min: 200, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 720, min: 400, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 560, min: 300, step: 10 },
      { key: "doors", label: "Дверцы", type: "number", defaultValue: 1, min: 0, step: 1 },
      { key: "drawers", label: "Ящики", type: "number", defaultValue: 0, min: 0, step: 1 },
      { key: "shelves", label: "Полки", type: "number", defaultValue: 1, min: 0, step: 1 },
      facadeField,
      { key: "useTipOn", label: "TIP-ON вместо ручек", type: "boolean", defaultValue: false },
    ],
  },
  {
    type: "kitchen_wall",
    category: "kitchen",
    categoryLabel: "Кухня",
    label: "Шкаф верхний",
    description: "Навесной кухонный модуль",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 600, min: 200, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 720, min: 300, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 300, min: 200, step: 10 },
      { key: "doors", label: "Дверцы", type: "number", defaultValue: 1, min: 0, step: 1 },
      { key: "shelves", label: "Полки", type: "number", defaultValue: 2, min: 0, step: 1 },
      facadeField,
      { key: "lighting", label: "Подсветка", type: "boolean", defaultValue: false },
      { key: "useTipOn", label: "TIP-ON вместо ручек", type: "boolean", defaultValue: false },
    ],
  },
  {
    type: "kitchen_tall",
    category: "kitchen",
    categoryLabel: "Кухня",
    label: "Пенал",
    description: "Высокий шкаф / колонна",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 600, min: 300, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 2100, min: 1500, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 560, min: 300, step: 10 },
      { key: "doors", label: "Дверцы", type: "number", defaultValue: 2, min: 0, step: 1 },
      { key: "drawers", label: "Ящики", type: "number", defaultValue: 0, min: 0, step: 1 },
      { key: "shelves", label: "Полки", type: "number", defaultValue: 4, min: 0, step: 1 },
      facadeField,
    ],
  },
  {
    type: "kitchen_countertop",
    category: "kitchen",
    categoryLabel: "Кухня",
    label: "Столешница",
    description: "Рабочая поверхность",
    fields: [
      { key: "lengthMm", label: "Длина, мм", type: "number", defaultValue: 3000, min: 500, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 600, min: 400, step: 10 },
      { key: "cutouts", label: "Вырезы (мойка/варочная)", type: "number", defaultValue: 1, min: 0, step: 1 },
    ],
  },
  {
    type: "kitchen_backsplash",
    category: "kitchen",
    categoryLabel: "Кухня",
    label: "Фартук / стеновая панель",
    description: "Панель над столешницей",
    fields: [
      { key: "lengthMm", label: "Длина, мм", type: "number", defaultValue: 3000, min: 500, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 600, min: 200, step: 10 },
    ],
  },
  {
    type: "cabinet",
    category: "casework",
    categoryLabel: "Корпусная",
    label: "Шкаф",
    description: "Шкаф с секциями, полками, дверцами",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 1000, min: 300, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 2200, min: 800, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 550, min: 250, step: 10 },
      { key: "sections", label: "Секции", type: "number", defaultValue: 2, min: 1, step: 1 },
      { key: "shelves", label: "Полки", type: "number", defaultValue: 5, min: 0, step: 1 },
      { key: "drawers", label: "Ящики", type: "number", defaultValue: 2, min: 0, step: 1 },
      { key: "doors", label: "Дверцы", type: "number", defaultValue: 2, min: 0, step: 1 },
      { key: "hasAntresol", label: "Антресоль", type: "boolean", defaultValue: false },
      facadeField,
      { key: "useTipOn", label: "TIP-ON вместо ручек", type: "boolean", defaultValue: false },
      { key: "lighting", label: "Подсветка", type: "boolean", defaultValue: false },
    ],
  },
  {
    type: "nightstand",
    category: "bedroom",
    categoryLabel: "Спальня",
    label: "Тумба",
    description: "Тумба с ящиками",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 500, min: 300, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 500, min: 300, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 400, min: 250, step: 10 },
      { key: "drawers", label: "Ящики", type: "number", defaultValue: 3, min: 0, step: 1 },
      { key: "doors", label: "Дверцы", type: "number", defaultValue: 0, min: 0, step: 1 },
      facadeField,
      { key: "onWheels", label: "На колёсах", type: "boolean", defaultValue: false },
    ],
  },
  {
    type: "wall_panel",
    category: "casework",
    categoryLabel: "Корпусная",
    label: "Панель на стену",
    description: "Стеновая / декоративная панель",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 800, min: 200, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 2500, min: 400, step: 10 },
      { key: "material", label: "Материал", type: "select", defaultValue: "ldsp", options: [
        { value: "ldsp", label: "ЛДСП" },
        { value: "mdf", label: "МДФ" },
      ]},
    ],
  },
  {
    type: "desk",
    category: "casework",
    categoryLabel: "Корпусная",
    label: "Рабочий стол",
    description: "Стол со столешницей и ящиками",
    fields: [
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 1800, min: 800, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 600, min: 400, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 750, min: 700, step: 10 },
      { key: "drawers", label: "Ящики", type: "number", defaultValue: 3, min: 0, step: 1 },
      facadeField,
      { key: "useTipOn", label: "TIP-ON вместо ручек", type: "boolean", defaultValue: true },
    ],
  },
  {
    type: "custom",
    category: "custom",
    categoryLabel: "Нестандарт",
    label: "Нестандартная мебель",
    description: "Свободное описание и ручные строки",
    fields: [
      { key: "title", label: "Название", type: "text", defaultValue: "Нестандарт" },
      { key: "widthMm", label: "Ширина, мм", type: "number", defaultValue: 1000, min: 100, step: 10 },
      { key: "heightMm", label: "Высота, мм", type: "number", defaultValue: 2000, min: 100, step: 10 },
      { key: "depthMm", label: "Глубина, мм", type: "number", defaultValue: 500, min: 100, step: 10 },
      { key: "doors", label: "Дверцы", type: "number", defaultValue: 0, min: 0, step: 1 },
      { key: "drawers", label: "Ящики", type: "number", defaultValue: 0, min: 0, step: 1 },
      { key: "shelves", label: "Полки", type: "number", defaultValue: 0, min: 0, step: 1 },
      { key: "notes", label: "Описание", type: "text", defaultValue: "" },
      facadeField,
    ],
  },
];

export function getCatalogByType(type: string): CatalogItemDef | undefined {
  return CATALOG.find((c) => c.type === type);
}

export function catalogCategories(): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const item of CATALOG) map.set(item.category, item.categoryLabel);
  return [...map.entries()].map(([id, label]) => ({ id, label }));
}

export function defaultParams(type: string): Record<string, string | number | boolean> {
  const def = getCatalogByType(type);
  if (!def) return {};
  const params: Record<string, string | number | boolean> = {};
  for (const f of def.fields) params[f.key] = f.defaultValue;
  return params;
}

export function num(params: Record<string, unknown>, key: string, fallback = 0): number {
  const v = params[key];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(params: Record<string, unknown>, key: string): boolean {
  return Boolean(params[key]);
}

export function facadeKey(type: FacadeType | string): string {
  switch (type) {
    case "enamel":
      return "facade-enamel";
    case "veneer":
      return "facade-veneer";
    case "frame":
      return "facade-frame";
    case "ldsp":
      return "board-ldsp-18";
    default:
      return "facade-film";
  }
}
