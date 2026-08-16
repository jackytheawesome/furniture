import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checklistConfidence,
  evaluateChecklist,
  type ChecklistStatus,
} from "@/lib/checklist";
import { getProjectForUser, parseJson } from "@/lib/project-access";
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

  const overrides: Record<string, ChecklistStatus> = {};
  for (const o of project.checklistOverrides) {
    overrides[o.ruleId] = o.status as ChecklistStatus;
  }

  const items = project.cartItems.map((c) => ({
    id: c.id,
    itemType: c.itemType,
    name: c.name,
    params: parseJson<Record<string, unknown>>(c.params, {}),
  }));

  const checklist = evaluateChecklist(items, project.lines, overrides);
  const confidence = checklistConfidence(checklist);
  return NextResponse.json({ checklist, confidence });
}

export async function POST(req: Request, ctx: Ctx) {
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
  const body = (await req.json()) as {
    ruleId: string;
    status: ChecklistStatus;
    note?: string;
  };
  await prisma.checklistOverride.upsert({
    where: {
      projectId_ruleId: { projectId: id, ruleId: body.ruleId },
    },
    update: { status: body.status, note: body.note ?? "" },
    create: {
      projectId: id,
      ruleId: body.ruleId,
      status: body.status,
      note: body.note ?? "",
    },
  });
  return NextResponse.json({ ok: true });
}
