import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importCartFromCsv, normalizePriceCategory, normalizeUnit } from "@/lib/import-smart";
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  let text = "";
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    text = await file.text();
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const sheet = wb.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: "Пустой Excel" }, { status: 400 });
    }
    const rows: string[][] = [];
    sheet.eachRow((row) => {
      const values = row.values as Array<string | number | undefined>;
      rows.push(values.slice(1).map((v) => String(v ?? "")));
    });
    if (!rows.length) {
      return NextResponse.json({ error: "Нет строк" }, { status: 400 });
    }
    const headers = rows[0];
    text = [
      headers.join(","),
      ...rows.slice(1).map((r) =>
        r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
  } else {
    return NextResponse.json(
      { error: "Нужен .csv / .txt / .xlsx" },
      { status: 400 },
    );
  }

  const result = importCartFromCsv(text);

  if (!apply) {
    return NextResponse.json({ preview: result });
  }

  if (result.profile === "prices") {
    let i = 0;
    for (const p of result.prices) {
      const key =
        p.key ||
        `import-${p.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}-${i++}`;
      await prisma.priceItem.upsert({
        where: { userId_key: { userId: session.user.id, key } },
        update: {
          name: p.name,
          category: normalizePriceCategory(p.category),
          unit: normalizeUnit(p.unit),
          price: p.price,
          note: p.note ?? "",
        },
        create: {
          userId: session.user.id,
          key,
          name: p.name,
          category: normalizePriceCategory(p.category),
          unit: normalizeUnit(p.unit),
          price: p.price,
          note: p.note ?? "",
        },
      });
    }
    return NextResponse.json({
      applied: "prices",
      count: result.prices.length,
    });
  }

  let sort =
    project.cartItems.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
  const created = [];
  for (const draft of result.items) {
    const item = await prisma.cartItem.create({
      data: {
        projectId,
        itemType: draft.itemType,
        name: draft.name,
        params: JSON.stringify(draft.params),
        sortOrder: sort++,
        visualHints: JSON.stringify({ schematic: draft.itemType, fromImport: true }),
      },
    });
    created.push(item);
  }
  const lines = await regenerateAutoLines(projectId, project.userId);
  return NextResponse.json({
    applied: result.profile,
    items: created,
    lines,
  });
}
