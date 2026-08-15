export type PriceUnit = "m2" | "lm" | "pcs" | "set" | "job";

export type PriceCategory =
  | "board"
  | "facade"
  | "edge"
  | "hardware"
  | "countertop"
  | "labor"
  | "other";

export type FacadeType = "film" | "enamel" | "veneer" | "frame";

export type EstimateMode = "quick" | "detailed";

export interface PriceItem {
  id: string;
  category: PriceCategory;
  name: string;
  unit: PriceUnit;
  price: number;
  note?: string;
  helpKey?: string;
}

export interface EstimateLine {
  id: string;
  category: PriceCategory | "margin";
  name: string;
  quantity: number;
  unit: PriceUnit | "%";
  unitPrice: number;
  enabled: boolean;
  note?: string;
  helpKey?: string;
  manualPrice?: boolean;
}

export interface QuickEstimateInput {
  lowerLm: number;
  upperLm: number;
  cabinetDepthM: number;
  facadeType: FacadeType;
  drawerCount: number;
  doorCount: number;
  tallUnitCount: number;
  applianceCount: number;
  hasCountertop: boolean;
  countertopLm: number;
  hasBacksplash: boolean;
  backsplashLm: number;
  lighting: boolean;
  delivery: boolean;
  installation: boolean;
}

export interface Project {
  id: string;
  clientName: string;
  objectName: string;
  mode: EstimateMode;
  marginPercent: number;
  lines: EstimateLine[];
  quickInput: QuickEstimateInput;
  updatedAt: string;
}

export interface AppData {
  prices: PriceItem[];
  project: Project;
}

export const UNIT_LABELS: Record<PriceUnit | "%", string> = {
  m2: "м²",
  lm: "п.м.",
  pcs: "шт.",
  set: "компл.",
  job: "услуга",
  "%": "%",
};

export const CATEGORY_LABELS: Record<PriceCategory | "margin", string> = {
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
  enamel: "Эмаль / краска",
  veneer: "Шпон",
  frame: "Рамочный / МДФ профиль",
};
