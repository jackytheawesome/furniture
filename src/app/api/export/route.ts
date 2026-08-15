import { NextResponse } from "next/server";
import type { Project } from "@/lib/types";
import { exportEstimateWorkbook } from "@/lib/excel-export";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      project: Project;
      includeInternal?: boolean;
    };
    if (!body?.project?.lines) {
      return NextResponse.json({ error: "Нет данных сметы" }, { status: 400 });
    }
    const blob = await exportEstimateWorkbook(body.project, {
      includeInternal: body.includeInternal ?? true,
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = `smeta-${(body.project.objectName || "project").replace(/\s+/g, "-")}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка экспорта";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
