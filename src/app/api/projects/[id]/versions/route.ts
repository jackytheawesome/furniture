import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checklistConfidence,
  evaluateChecklist,
  type ChecklistStatus,
} from "@/lib/checklist";
import { sumLines, withMargin } from "@/lib/line-engine";
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
  return NextResponse.json({ versions: project.versions });
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
    kind?: "DRAFT" | "CLIENT";
    label?: string;
    notes?: string;
  };

  const overrides: Record<string, ChecklistStatus> = {};
  for (const o of project.checklistOverrides) {
    overrides[o.ruleId] = o.status as ChecklistStatus;
  }
  const checklist = evaluateChecklist(
    project.cartItems.map((c) => ({
      id: c.id,
      itemType: c.itemType,
      name: c.name,
      params: parseJson(c.params, {}),
    })),
    project.lines,
    overrides,
  );
  const confidence = checklistConfidence(checklist);
  const totals = withMargin(sumLines(project.lines), project.marginPercent);

  const clientCount = project.versions.filter((v) => v.kind === "CLIENT").length;
  const kind = body.kind ?? "DRAFT";
  const label =
    body.label ||
    (kind === "CLIENT"
      ? `Клиенту v${clientCount + 1}`
      : `Черновик ${new Date().toLocaleString("ru-RU")}`);

  const version = await prisma.estimateVersion.create({
    data: {
      projectId: id,
      kind,
      label,
      confidence,
      notes: body.notes ?? "",
      total: totals.total,
      snapshot: JSON.stringify({
        project: {
          clientName: project.clientName,
          objectName: project.objectName,
          marginPercent: project.marginPercent,
        },
        cartItems: project.cartItems,
        lines: project.lines,
        checklist,
        totals,
        visualHints: parseJson(project.visualHints, {}),
      }),
    },
  });

  return NextResponse.json({ version });
}
