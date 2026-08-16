import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectForUser, parseJson } from "@/lib/project-access";
import { regenerateAutoLines } from "@/lib/regenerate";
import type { Role } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId, itemId } = await ctx.params;
  const project = await getProjectForUser(
    projectId,
    session.user.id,
    session.user.role as Role,
  );
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const item = project.cartItems.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    name?: string;
    params?: Record<string, unknown>;
  };
  const current = parseJson<Record<string, unknown>>(item.params, {});
  const updated = await prisma.cartItem.update({
    where: { id: itemId },
    data: {
      name: body.name?.trim() || item.name,
      params: JSON.stringify({ ...current, ...(body.params ?? {}) }),
    },
  });
  const lines = await regenerateAutoLines(projectId, project.userId);
  return NextResponse.json({ item: updated, lines });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId, itemId } = await ctx.params;
  const project = await getProjectForUser(
    projectId,
    session.user.id,
    session.user.role as Role,
  );
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.cartItem.delete({ where: { id: itemId } });
  const lines = await regenerateAutoLines(projectId, project.userId);
  return NextResponse.json({ lines });
}
