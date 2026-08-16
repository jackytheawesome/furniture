export type ChecklistStatus = "ok" | "missing" | "skipped";

export interface ChecklistItem {
  ruleId: string;
  label: string;
  detail: string;
  status: ChecklistStatus;
  relatedItemIds?: string[];
}

interface CartLike {
  id: string;
  itemType: string;
  name: string;
  params: Record<string, unknown>;
}

interface LineLike {
  cartItemId: string | null;
  name: string;
  category: string;
  enabled: boolean;
  quantity: number;
}

function num(p: Record<string, unknown>, k: string): number {
  const v = p[k];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasLine(
  lines: LineLike[],
  cartItemId: string,
  match: (l: LineLike) => boolean,
): boolean {
  return lines.some(
    (l) => l.enabled && l.cartItemId === cartItemId && l.quantity > 0 && match(l),
  );
}

export function evaluateChecklist(
  items: CartLike[],
  lines: LineLike[],
  overrides: Record<string, ChecklistStatus> = {},
): ChecklistItem[] {
  const results: ChecklistItem[] = [];

  for (const item of items) {
    const doors = num(item.params, "doors");
    const drawers = num(item.params, "drawers");
    const isBase =
      item.itemType === "kitchen_base" ||
      item.itemType === "kitchen_tall" ||
      item.itemType === "cabinet";

    if (doors > 0) {
      const ruleId = `doors-hinges:${item.id}`;
      const ok = hasLine(
        lines,
        item.id,
        (l) =>
          l.category === "hardware" &&
          /петл/i.test(l.name),
      );
      results.push({
        ruleId,
        label: `${item.name}: петли на дверцы`,
        detail: `Дверцы: ${doors}. Нужны петли в смете.`,
        status: overrides[ruleId] ?? (ok ? "ok" : "missing"),
        relatedItemIds: [item.id],
      });
    }

    if (drawers > 0) {
      const ruleId = `drawers-runners:${item.id}`;
      const ok = hasLine(
        lines,
        item.id,
        (l) =>
          l.category === "hardware" &&
          /(направля|тандем)/i.test(l.name),
      );
      results.push({
        ruleId,
        label: `${item.name}: направляющие на ящики`,
        detail: `Ящики: ${drawers}.`,
        status: overrides[ruleId] ?? (ok ? "ok" : "missing"),
        relatedItemIds: [item.id],
      });
    }

    if (doors + drawers > 0) {
      const ruleId = `handles:${item.id}`;
      const ok = hasLine(
        lines,
        item.id,
        (l) =>
          l.category === "hardware" &&
          /(ручк|tip-on|TIP-ON|push)/i.test(l.name),
      );
      results.push({
        ruleId,
        label: `${item.name}: ручки или TIP-ON`,
        detail: "Должен быть способ открывания.",
        status: overrides[ruleId] ?? (ok ? "ok" : "missing"),
        relatedItemIds: [item.id],
      });
    }

    if (isBase) {
      const ruleId = `plinth:${item.id}`;
      const ok = hasLine(
        lines,
        item.id,
        (l) => /цокол|опор/i.test(l.name),
      );
      results.push({
        ruleId,
        label: `${item.name}: цоколь/опоры`,
        detail: "Нижний ряд обычно требует опоры и цоколь.",
        status: overrides[ruleId] ?? (ok ? "ok" : "missing"),
        relatedItemIds: [item.id],
      });
    }

    if (item.itemType === "kitchen_countertop") {
      const ruleId = `countertop:${item.id}`;
      const ok = hasLine(lines, item.id, (l) => /столеш/i.test(l.name));
      results.push({
        ruleId,
        label: `${item.name}: столешница в смете`,
        detail: "Проверьте материал и вырезы.",
        status: overrides[ruleId] ?? (ok ? "ok" : "missing"),
        relatedItemIds: [item.id],
      });
    }

    const edgeRule = `edge:${item.id}`;
    if (
      !["kitchen_countertop", "kitchen_backsplash"].includes(item.itemType)
    ) {
      const ok = hasLine(lines, item.id, (l) => l.category === "edge");
      results.push({
        ruleId: edgeRule,
        label: `${item.name}: кромка`,
        detail: "Корпусные детали обычно кромятся.",
        status: overrides[edgeRule] ?? (ok ? "ok" : "missing"),
        relatedItemIds: [item.id],
      });
    }
  }

  // Project-level
  const hasDelivery = lines.some(
    (l) => l.enabled && !l.cartItemId && /доставк/i.test(l.name),
  );
  results.push({
    ruleId: "project-delivery",
    label: "Доставка",
    detail: "Общая статья проекта или явно «не нужна».",
    status: overrides["project-delivery"] ?? (hasDelivery ? "ok" : "missing"),
  });

  const hasInstall = lines.some(
    (l) => l.enabled && /монтаж/i.test(l.name),
  );
  results.push({
    ruleId: "project-install",
    label: "Монтаж",
    detail: "Учтена установка на объекте?",
    status: overrides["project-install"] ?? (hasInstall ? "ok" : "missing"),
  });

  return results;
}

export function checklistConfidence(
  items: ChecklistItem[],
): "low" | "medium" | "high" {
  const active = items.filter((i) => i.status !== "skipped");
  if (!active.length) return "medium";
  const missing = active.filter((i) => i.status === "missing").length;
  const ratio = missing / active.length;
  if (ratio === 0) return "high";
  if (ratio <= 0.25) return "medium";
  return "low";
}
