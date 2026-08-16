import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  checklistConfidence,
  evaluateChecklist,
  type ChecklistStatus,
} from "@/lib/checklist";
import { buildEstimateWorkbook } from "@/lib/excel-export";
import { getProjectForUser, parseJson } from "@/lib/project-access";
import type { Role } from "@/lib/roles";
import type { Confidence } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

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

  const body = (await req.json().catch(() => ({}))) as {
    mode?: "internal" | "client";
  };
  const mode = body.mode ?? "internal";

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
  const confidence = checklistConfidence(checklist) as Confidence;

  const buffer = await buildEstimateWorkbook(
    {
      clientName: project.clientName,
      objectName: project.objectName,
      marginPercent: project.marginPercent,
      lines: project.lines,
      checklist,
      confidence,
    },
    mode,
  );

  const filename = `smeta-${project.objectName.replace(/\s+/g, "-")}-${mode}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
