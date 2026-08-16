import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectForUser } from "@/lib/project-access";
import type { Role } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const project = await getProjectForUser(
    id,
    session.user.id,
    session.user.role as Role,
  );
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getProjectForUser(
    id,
    session.user.id,
    session.user.role as Role,
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const project = await prisma.project.update({
    where: { id },
    data: {
      clientName:
        typeof body.clientName === "string" ? body.clientName : undefined,
      objectName:
        typeof body.objectName === "string" ? body.objectName : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      marginPercent:
        typeof body.marginPercent === "number" ? body.marginPercent : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      visualHints:
        typeof body.visualHints === "string" ? body.visualHints : undefined,
    },
    include: {
      cartItems: { orderBy: { sortOrder: "asc" } },
      lines: { orderBy: { sortOrder: "asc" } },
      checklistOverrides: true,
      versions: { orderBy: { createdAt: "desc" } },
    },
  });
  return NextResponse.json({ project });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getProjectForUser(
    id,
    session.user.id,
    session.user.role as Role,
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.project.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return NextResponse.json({ ok: true });
}
