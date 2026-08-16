import { prisma } from "./prisma";
import {
  buildLinesForItem,
  buildProjectCommonLines,
  type DraftLine,
} from "./line-engine";
import { parseJson, priceMapForUser } from "./project-access";

export async function regenerateAutoLines(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { cartItems: true, lines: true },
  });
  if (!project || project.userId !== userId) {
    throw new Error("NOT_FOUND");
  }

  const prices = await priceMapForUser(userId);
  const manualLines = project.lines.filter((l) => l.source === "manual");

  await prisma.estimateLine.deleteMany({
    where: { projectId, source: { in: ["auto", "import"] } },
  });

  const drafts: (DraftLine & { cartItemId: string | null; sortOrder: number })[] =
    [];
  let sort = 0;

  for (const item of project.cartItems) {
    const params = parseJson<Record<string, unknown>>(item.params, {});
    const itemLines = buildLinesForItem(item.itemType, item.name, params, prices);
    for (const line of itemLines) {
      drafts.push({ ...line, cartItemId: item.id, sortOrder: sort++ });
    }
  }

  // Detect project-level toggles from remaining manual names or defaults
  const common = buildProjectCommonLines(prices, {
    delivery: true,
    installation: true,
    measure: false,
    risk: false,
    installLm: Math.max(
      1,
      project.cartItems.reduce((acc, item) => {
        const p = parseJson<Record<string, unknown>>(item.params, {});
        const w = Number(p.widthMm ?? p.lengthMm ?? 1000) / 1000;
        return acc + (Number.isFinite(w) ? w : 1);
      }, 0),
    ),
  });
  for (const line of common) {
    drafts.push({ ...line, cartItemId: null, sortOrder: sort++ });
  }

  if (drafts.length) {
    await prisma.estimateLine.createMany({
      data: drafts.map((d) => ({
        projectId,
        cartItemId: d.cartItemId,
        category: d.category,
        name: d.name,
        quantity: d.quantity,
        unit: d.unit,
        unitPrice: d.unitPrice,
        enabled: d.enabled,
        helpKey: d.helpKey,
        note: d.note ?? "",
        sortOrder: d.sortOrder,
        source: d.source,
      })),
    });
  }

  // Keep manuals at the end
  let manualSort = sort;
  for (const m of manualLines) {
    await prisma.estimateLine.update({
      where: { id: m.id },
      data: { sortOrder: manualSort++ },
    });
  }

  return prisma.estimateLine.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });
}
