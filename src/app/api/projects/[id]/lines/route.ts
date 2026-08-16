import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectForUser } from "@/lib/project-access";
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
    category?: string;
    name?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    helpKey?: string;
    note?: string;
    cartItemId?: string | null;
  };

  const maxSort = project.lines.reduce((m, l) => Math.max(m, l.sortOrder), -1);
  const line = await prisma.estimateLine.create({
    data: {
      projectId,
      cartItemId: body.cartItemId ?? null,
      category: body.category ?? "other",
      name: body.name?.trim() || "Ручная статья",
      quantity: body.quantity ?? 1,
      unit: body.unit ?? "pcs",
      unitPrice: body.unitPrice ?? 0,
      enabled: true,
      helpKey: body.helpKey,
      note: body.note ?? "",
      sortOrder: maxSort + 1,
      source: "manual",
    },
  });
  return NextResponse.json({ line });
}

export async function PATCH(req: Request, ctx: Ctx) {
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
    lineId: string;
    patch: Record<string, unknown>;
  };
  const line = project.lines.find((l) => l.id === body.lineId);
  if (!line) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  const p = body.patch ?? {};
  const updated = await prisma.estimateLine.update({
    where: { id: body.lineId },
    data: {
      name: typeof p.name === "string" ? p.name : undefined,
      quantity: typeof p.quantity === "number" ? p.quantity : undefined,
      unit: typeof p.unit === "string" ? p.unit : undefined,
      unitPrice: typeof p.unitPrice === "number" ? p.unitPrice : undefined,
      enabled: typeof p.enabled === "boolean" ? p.enabled : undefined,
      note: typeof p.note === "string" ? p.note : undefined,
      category: typeof p.category === "string" ? p.category : undefined,
      source: line.source === "auto" ? "manual" : line.source,
    },
  });
  return NextResponse.json({ line: updated });
}

export async function DELETE(req: Request, ctx: Ctx) {
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
  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get("lineId");
  if (!lineId) {
    return NextResponse.json({ error: "lineId required" }, { status: 400 });
  }
  const line = project.lines.find((l) => l.id === lineId);
  if (!line) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }
  await prisma.estimateLine.delete({ where: { id: lineId } });
  return NextResponse.json({ ok: true });
}
