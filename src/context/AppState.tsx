"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  EstimateLine,
  PriceItem,
  Project,
  QuickEstimateInput,
} from "@/lib/types";
import {
  addBlankLine,
  buildQuickEstimateLines,
  createDefaultProject,
  recalculateQuick,
  removeLine,
  updateLine,
} from "@/lib/estimate-engine";
import { DEMO_PRICES } from "@/lib/demo-prices";
import { loadAppData, resetToDemo, saveAppData } from "@/lib/storage";

interface AppContextValue {
  ready: boolean;
  prices: PriceItem[];
  project: Project;
  setProjectMeta: (patch: Partial<Pick<Project, "clientName" | "objectName" | "mode" | "marginPercent">>) => void;
  setQuickInput: (patch: Partial<QuickEstimateInput>) => void;
  rebuildQuick: () => void;
  setLines: (lines: EstimateLine[]) => void;
  patchLine: (id: string, patch: Partial<EstimateLine>) => void;
  addLine: () => void;
  deleteLine: (id: string) => void;
  setPrices: (prices: PriceItem[]) => void;
  resetDemo: () => void;
  switchToDetailed: () => void;
  switchToQuick: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>({
    prices: DEMO_PRICES,
    project: createDefaultProject(DEMO_PRICES),
  });

  useEffect(() => {
    setData(loadAppData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveAppData(data);
  }, [data, ready]);

  const updateProject = useCallback((fn: (p: Project) => Project) => {
    setData((prev) => ({
      ...prev,
      project: { ...fn(prev.project), updatedAt: new Date().toISOString() },
    }));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      prices: data.prices,
      project: data.project,
      setProjectMeta: (patch) =>
        updateProject((p) => ({ ...p, ...patch })),
      setQuickInput: (patch) =>
        updateProject((p) => ({
          ...p,
          quickInput: { ...p.quickInput, ...patch },
        })),
      rebuildQuick: () =>
        setData((prev) => ({
          ...prev,
          project: recalculateQuick(prev.project, prev.prices),
        })),
      setLines: (lines) => updateProject((p) => ({ ...p, lines })),
      patchLine: (id, patch) =>
        updateProject((p) => ({
          ...p,
          lines: updateLine(p.lines, id, patch),
        })),
      addLine: () =>
        updateProject((p) => ({ ...p, lines: addBlankLine(p.lines) })),
      deleteLine: (id) =>
        updateProject((p) => ({ ...p, lines: removeLine(p.lines, id) })),
      setPrices: (prices) =>
        setData((prev) => ({
          ...prev,
          prices,
          project:
            prev.project.mode === "quick"
              ? {
                  ...prev.project,
                  lines: buildQuickEstimateLines(
                    prev.project.quickInput,
                    prices,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : prev.project,
        })),
      resetDemo: () => setData(resetToDemo()),
      switchToDetailed: () =>
        updateProject((p) => ({ ...p, mode: "detailed" })),
      switchToQuick: () =>
        setData((prev) => ({
          ...prev,
          project: recalculateQuick(
            { ...prev.project, mode: "quick" },
            prev.prices,
          ),
        })),
    }),
    [data, ready, updateProject],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
