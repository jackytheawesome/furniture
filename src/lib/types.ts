export type PriceUnit = "m2" | "lm" | "pcs" | "set" | "job";

export type PriceCategory =
  | "board"
  | "facade"
  | "edge"
  | "hardware"
  | "countertop"
  | "labor"
  | "other";

export type LineCategory = PriceCategory | "margin";

export type FacadeType = "film" | "enamel" | "veneer" | "frame" | "ldsp";

export type Confidence = "low" | "medium" | "high";

export const UNIT_LABELS: Record<PriceUnit | "%", string> = {
  m2: "м²",
  lm: "п.м.",
  pcs: "шт.",
  set: "компл.",
  job: "услуга",
  "%": "%",
};

export const CATEGORY_LABELS: Record<LineCategory, string> = {
  board: "Корпуса / плита",
  facade: "Фасады",
  edge: "Кромка",
  hardware: "Фурнитура",
  countertop: "Столешница / панели",
  labor: "Работы",
  other: "Прочее",
  margin: "Наценка",
};

export const FACADE_LABELS: Record<FacadeType, string> = {
  film: "Плёнка ПВХ",
  enamel: "Эмаль",
  veneer: "Шпон",
  frame: "Рамочный",
  ldsp: "ЛДСП",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: "Низкая точность (± широкий порядок)",
  medium: "Средняя точность (ориентир для клиента)",
  high: "Высокая точность (после уточнений/замеров)",
};
