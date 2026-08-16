import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCatalogByType, defaultParams } from "@/lib/catalog";
import { getProjectForUser } from "@/lib/project-access";
import { regenerateAutoLines } from "@/lib/regenerate";
import type { Role } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId } = await ctx.params;
  const project = await getProjectForUser(
    projectId,
    session.user.id,
    session.user.role as Role,
  );
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    itemType?: string;
    name?: string;
    params?: Record<string, unknown>;
  };
  const def = getCatalogByType(body.itemType ?? "");
  if (!def) {
    return NextResponse.json({ error: "Unknown item type" }, { status: 400 });
  }

  const params = {
    ...defaultParams(def.type),
    ...(body.params ?? {}),
  };
  const name =
    body.name?.trim() ||
    (def.type === "custom" && typeof params.title === "string"
      ? params.title
      : def.label);

  const maxSort = project.cartItems.reduce(
    (m, i) => Math.max(m, i.sortOrder),
    -1,
  );

  const item = await prisma.cartItem.create({
    data: {
      projectId,
      itemType: def.type,
      name,
      params: JSON.stringify(params),
      sortOrder: maxSort + 1,
      visualHints: JSON.stringify({ schematic: def.type }),
    },
  });

  const lines = await regenerateAutoLines(projectId, project.userId);
  return NextResponse.json({ item, lines });
}
