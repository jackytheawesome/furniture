import type { AppData, PriceItem, Project } from "./types";
import { DEMO_PRICES } from "./demo-prices";
import { createDefaultProject } from "./estimate-engine";

const STORAGE_KEY = "furniture-estimator-v1";

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return {
      prices: DEMO_PRICES,
      project: createDefaultProject(DEMO_PRICES),
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        prices: DEMO_PRICES,
        project: createDefaultProject(DEMO_PRICES),
      };
    }
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.prices?.length || !parsed.project) {
      throw new Error("invalid");
    }
    return parsed;
  } catch {
    return {
      prices: DEMO_PRICES,
      project: createDefaultProject(DEMO_PRICES),
    };
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetToDemo(): AppData {
  const data: AppData = {
    prices: DEMO_PRICES,
    project: createDefaultProject(DEMO_PRICES),
  };
  saveAppData(data);
  return data;
}

export function replacePrices(prices: PriceItem[], project: Project): AppData {
  const data: AppData = { prices, project };
  saveAppData(data);
  return data;
}
