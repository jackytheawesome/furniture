export interface ParsedDesignerItem {
  name: string;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  facades?: string;
  carcass?: string;
  hardware?: string;
  handles?: string;
  notes?: string;
  itemType: string;
}

/** Heuristic parser for designer PDF text blocks (Фасады/Корпус/Фурнитура/Ручки). */
export function parseDesignerPdfText(text: string): {
  items: ParsedDesignerItem[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const cleaned = text.replace(/\r/g, "\n");
  const chunks = cleaned.split(/\n(?=[А-ЯA-Z][^:\n]{3,80}\s*\()/);

  const items: ParsedDesignerItem[] = [];
  const dimRe =
    /(\d{2,4})\s*[xх×]\s*(\d{2,4})(?:\s*[xх×]\s*(\d{2,4}))?/i;

  const blocks =
    chunks.length > 1
      ? chunks
      : cleaned.split(/\n{2,}/).filter((b) => dimRe.test(b) || /фасад/i.test(b));

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    const header = lines[0];
    const dims = header.match(dimRe) || block.match(dimRe);
    if (!dims && !/фасад|корпус|фурнитур/i.test(block)) continue;

    const name = header.replace(dimRe, "").replace(/[()]/g, "").trim() ||
      "Изделие из PDF";

    const field = (label: RegExp) => {
      const line = lines.find((l) => label.test(l));
      if (!line) return undefined;
      return line.split(/[:–-]/).slice(1).join(":").trim() || line;
    };

    const lower = name.toLowerCase();
    let itemType = "custom";
    if (/тумб/i.test(lower)) itemType = "nightstand";
    else if (/стол/i.test(lower)) itemType = "desk";
    else if (/панел/i.test(lower)) itemType = "wall_panel";
    else if (/шкаф|пенал|канцеляр/i.test(lower)) itemType = "cabinet";
    else if (/столеш/i.test(lower)) itemType = "kitchen_countertop";

    items.push({
      name,
      widthMm: dims ? Number(dims[1]) : undefined,
      heightMm: dims ? Number(dims[2]) : undefined,
      depthMm: dims?.[3] ? Number(dims[3]) : undefined,
      facades: field(/фасад/i),
      carcass: field(/корпус|полк/i),
      hardware: field(/фурнитур/i),
      handles: field(/ручк/i),
      notes: lines.slice(1).join(" | ").slice(0, 500),
      itemType,
    });
  }

  if (!items.length) {
    warnings.push(
      "Не удалось уверенно разобрать блоки. Проверьте, что PDF текстовый (не скан).",
    );
  } else {
    warnings.push(
      "Черновик из PDF: сверьте размеры и состав перед расчётом для клиента.",
    );
  }

  return { items, warnings };
}

export function designerItemToCart(item: ParsedDesignerItem) {
  const tipOn = /tip-on|push/i.test(item.handles ?? "");
  return {
    itemType: item.itemType,
    name: item.name,
    params: {
      title: item.name,
      widthMm: item.widthMm ?? 1000,
      heightMm: item.heightMm ?? 2000,
      depthMm: item.depthMm ?? 500,
      doors: /шкаф|двер/i.test(item.name) ? 2 : 0,
      drawers: /тумб|ящик|стол/i.test(item.name) ? 3 : 0,
      shelves: /полк|шкаф/i.test(item.name) ? 4 : 0,
      sections: 1,
      facadeType: /лДСП|лдсп|ldsp/i.test(item.facades ?? "") ? "ldsp" : "film",
      useTipOn: tipOn,
      notes: [item.facades, item.carcass, item.hardware, item.handles, item.notes]
        .filter(Boolean)
        .join("; "),
    },
  };
}
