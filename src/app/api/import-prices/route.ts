import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parsePricesCsv, parsePricesXlsx } from "@/lib/import-prices";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    let items;
    if (name.endsWith(".csv")) {
      items = parsePricesCsv(await file.text());
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      items = await parsePricesXlsx(await file.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "Нужен файл .csv или .xlsx" },
        { status: 400 },
      );
    }
    if (!items.length) {
      return NextResponse.json(
        { error: "В файле не найдено строк прайса" },
        { status: 400 },
      );
    }
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка импорта";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
