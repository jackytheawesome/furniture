import { prisma } from "./prisma";
import type { Role } from "./roles";
import type { PriceMap } from "./line-engine";

export async function getProjectForUser(
  projectId: string,
  userId: string,
  role: Role,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      cartItems: { orderBy: { sortOrder: "asc" } },
      lines: { orderBy: { sortOrder: "asc" } },
      checklistOverrides: true,
      versions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;
  if (project.userId !== userId && role !== "ADMIN") return null;
  return project;
}

export async function priceMapForUser(userId: string): Promise<PriceMap> {
  const items = await prisma.priceItem.findMany({ where: { userId } });
  const map: PriceMap = {};
  for (const p of items) {
    map[p.key] = {
      name: p.name,
      unit: p.unit as PriceMap[string]["unit"],
      price: p.price,
      category: p.category,
      helpKey: p.helpKey,
    };
  }
  return map;
}

export function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
