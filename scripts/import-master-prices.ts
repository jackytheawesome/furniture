/**
 * Импорт master_price.xlsx (лист Prices) в PriceItem всех пользователей
 * + обновление ключей движка из RENAISSANCE_ENGINE_DEFAULTS.
 *
 * Usage: npx tsx scripts/import-master-prices.ts
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { RENAISSANCE_ENGINE_DEFAULTS } from "../src/lib/renaissance-defaults";

const prisma = new PrismaClient();
const ROOT = path.join(process.cwd(), "data/pricing_package");
const PARSED = path.join(ROOT, "parsed_prices.json");
const SHEET = path.join(process.cwd(), "data/_mp_xlsx/xl/worksheets/sheet2.xml");

function decode(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function normalizeUnit(raw: string): "m2" | "lm" | "pcs" | "set" | "job" | null {
  const u = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!u) return null;
  if (/^(кв\.?м\.?|м\.?кв\.?|кв\/м|к\.м\.?)$/.test(u)) return "m2";
  if (/^(п\.?м\.?|м\.?п\.?|п\/м|м)$/.test(u)) return "lm";
  if (/^(шт\.?|шт,)$/.test(u)) return "pcs";
  if (/^(компл\.?|комплект)$/.test(u)) return "set";
  if (u === "%" || u === "изделие") return "job";
  // garbage like "7 930" means misaligned columns — skip
  if (/^\d/.test(u)) return null;
  return null;
}

function normalizeCategory(section: string, name: string): string {
  const t = `${section} ${name}`.toLowerCase();
  if (/кромк/.test(t)) return "edge";
  if (/петл|направля|ручк|tip|push|опор|ножк|фурнитур|тандем|movento|blum/.test(t))
    return "hardware";
  if (/столеш|стенов|фартук/.test(t)) return "countertop";
  if (/плёнк|пленк|эмал|шпон|фасад|мдф/.test(t)) return "facade";
  if (/лдсп|дсп|хдф|двп|корпус/.test(t)) return "board";
  if (/работ|раскро|монтаж|достав|замер|сборк/.test(t)) return "labor";
  return "other";
}

function slugKey(section: string, name: string, idx: number) {
  const base = `${section}-${name}`
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `ren-${base || "item"}-${idx}`;
}

function parseSheetXml(xml: string) {
  const rows: Record<string, string | number>[] = [];
  const rowRe = /<x:row[^>]*>([\s\S]*?)<\/x:row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells: Record<string, string | number> = {};
    const cellRe =
      /<x:c r="([A-Z]+)(\d+)"[^>]*?(?: t="([^"]+)")?[^>]*>(?:<x:v>([\s\S]*?)<\/x:v>)?/g;
    let cm;
    while ((cm = cellRe.exec(rm[1]))) {
      let v: string | number = decode(cm[4] ?? "");
      const t = cm[3];
      if (
        t === "n" ||
        (t !== "str" && t !== "b" && v !== "" && !Number.isNaN(Number(v)))
      ) {
        const n = Number(v);
        if (!Number.isNaN(n)) v = n;
      }
      cells[cm[1]] = v;
    }
    if (Object.keys(cells).length) rows.push(cells);
  }
  return rows;
}

async function main() {
  let items: Array<{
    section: string;
    name: string;
    unit: string;
    price: number;
    status: string;
    source: string;
    file: string;
  }> = [];

  if (fs.existsSync(PARSED)) {
    const parsed = JSON.parse(fs.readFileSync(PARSED, "utf8"));
    items = parsed.items;
  } else if (fs.existsSync(SHEET)) {
    const rows = parseSheetXml(fs.readFileSync(SHEET, "utf8")).slice(1);
    items = rows.map((r) => ({
      section: String(r.D ?? ""),
      name: String(r.E ?? "").trim(),
      unit: String(r.F ?? "").trim(),
      price:
        typeof r.G === "number"
          ? r.G
          : Number(String(r.G ?? "").replace(/\s/g, "").replace(",", ".")),
      status: String(r.H ?? ""),
      source: String(r.I ?? ""),
      file: String(r.B ?? ""),
    }));
  } else {
    throw new Error("No parsed_prices.json and no unpacked sheet2.xml");
  }

  const normalized = items
    .map((it, idx) => {
      const unit = normalizeUnit(it.unit);
      if (!it.name || !Number.isFinite(it.price) || !unit) return null;
      return {
        key: slugKey(it.section, it.name, idx),
        category: normalizeCategory(it.section, it.name),
        name: it.section ? `${it.section}: ${it.name}` : it.name,
        unit,
        price: it.price,
        note: [it.status, it.file].filter(Boolean).join(" · "),
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    category: string;
    name: string;
    unit: string;
    price: number;
    note: string;
  }>;

  console.log(`Normalized catalog rows: ${normalized.length}`);

  const users = await prisma.user.findMany();
  if (!users.length) throw new Error("No users — run prisma db seed first");

  for (const user of users) {
    // Engine defaults first (overwrite keys)
    for (const p of RENAISSANCE_ENGINE_DEFAULTS) {
      await prisma.priceItem.upsert({
        where: { userId_key: { userId: user.id, key: p.key } },
        update: {
          category: p.category,
          name: p.name,
          unit: p.unit,
          price: p.price,
          note: p.note ?? "",
          helpKey: p.helpKey,
        },
        create: {
          userId: user.id,
          key: p.key,
          category: p.category,
          name: p.name,
          unit: p.unit,
          price: p.price,
          note: p.note ?? "",
          helpKey: p.helpKey,
        },
      });
    }

    // Full catalog (skip if key collision with engine keys)
    const engineKeys = new Set(RENAISSANCE_ENGINE_DEFAULTS.map((p) => p.key));
    let upserted = 0;
    for (const p of normalized) {
      if (engineKeys.has(p.key)) continue;
      await prisma.priceItem.upsert({
        where: { userId_key: { userId: user.id, key: p.key } },
        update: {
          category: p.category,
          name: p.name,
          unit: p.unit,
          price: p.price,
          note: p.note,
        },
        create: {
          userId: user.id,
          key: p.key,
          category: p.category,
          name: p.name,
          unit: p.unit,
          price: p.price,
          note: p.note,
        },
      });
      upserted++;
      if (upserted % 500 === 0) console.log(`  ${user.email}: ${upserted}…`);
    }
    console.log(`${user.email}: engine defaults + ${upserted} catalog rows`);
  }

  // Write slim CSV for UI import
  const csvPath = path.join(ROOT, "renaissance_prices_normalized.csv");
  const header = "id,category,name,unit,price,note\n";
  const lines = [
    ...RENAISSANCE_ENGINE_DEFAULTS.map(
      (p) =>
        `${p.key},${p.category},"${p.name.replace(/"/g, '""')}",${p.unit},${p.price},"${(p.note ?? "").replace(/"/g, '""')}"`,
    ),
    ...normalized.slice(0, 2000).map(
      (p) =>
        `${p.key},${p.category},"${p.name.replace(/"/g, '""')}",${p.unit},${p.price},"${p.note.replace(/"/g, '""')}"`,
    ),
  ];
  fs.writeFileSync(csvPath, header + lines.join("\n"), "utf8");
  console.log("Wrote", csvPath);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
