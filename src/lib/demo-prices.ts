import { RENAISSANCE_ENGINE_DEFAULTS } from "./renaissance-defaults";
import type { PriceCategory, PriceUnit } from "./types";

export interface DemoPriceSeed {
  key: string;
  category: PriceCategory;
  name: string;
  unit: PriceUnit;
  price: number;
  note?: string;
  helpKey?: string;
}

/** Alias: engine defaults from Renaissance master_price (03.07.2026). */
export const DEMO_PRICE_SEEDS: DemoPriceSeed[] = RENAISSANCE_ENGINE_DEFAULTS;
