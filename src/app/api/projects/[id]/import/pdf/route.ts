import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { designerItemToCart, parseDesignerPdfText } from "@/lib/pdf-import";
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

  const form = await req.formData();
  const file = form.get("file");
  const apply = form.get("apply") === "1";
  const selected = form.get("selected"); // JSON array of indexes when apply

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Нужен PDF" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text || "";
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Не удалось прочитать PDF (нужен текстовый PDF)",
      },
      { status: 400 },
    );
  }

  const { items, warnings } = parseDesignerPdfText(text);
  const drafts = items.map(designerItemToCart);

  if (!apply) {
    return NextResponse.json({ preview: { items: drafts, warnings, rawCount: items.length } });
  }

  const indexes: number[] = selected
    ? (JSON.parse(String(selected)) as number[])
    : drafts.map((_, i) => i);

  let sort =
    project.cartItems.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
  const created = [];
  for (const idx of indexes) {
    const draft = drafts[idx];
    if (!draft) continue;
    const item = await prisma.cartItem.create({
      data: {
        projectId,
        itemType: draft.itemType,
        name: draft.name,
        params: JSON.stringify(draft.params),
        sortOrder: sort++,
        visualHints: JSON.stringify({
          schematic: draft.itemType,
          fromPdf: true,
        }),
      },
    });
    created.push(item);
  }

  const lines = await regenerateAutoLines(projectId, project.userId);
  return NextResponse.json({ items: created, lines, warnings });
}
