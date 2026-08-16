import type ExcelJS from "exceljs";
import { CATEGORY_LABELS, CONFIDENCE_LABELS, UNIT_LABELS, type Confidence } from "./types";
import { getGlossary } from "./glossary";
import { formatRub, sumLines, withMargin } from "./line-engine";

interface ExportLine {
  enabled: boolean;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  note?: string;
  helpKey?: string | null;
}

interface ExportProject {
  clientName: string;
  objectName: string;
  marginPercent: number;
  lines: ExportLine[];
  checklist?: { label: string; status: string; detail: string }[];
  confidence?: Confidence;
}

function lineSum(l: ExportLine): number {
  return l.enabled ? l.quantity * l.unitPrice : 0;
}

export async function buildEstimateWorkbook(
  project: ExportProject,
  mode: "internal" | "client",
): Promise<Buffer> {
  const ExcelJSMod = (await import("exceljs")).default;
  const wb = new ExcelJSMod.Workbook();
  wb.creator = "КорпусСмета";

  const sheet = wb.addWorksheet(mode === "client" ? "Клиенту" : "Внутреннее");
  sheet.addRow([
    `Смета: ${project.objectName} — ${project.clientName}`,
  ]).font = { bold: true, size: 14 };
  sheet.addRow([`Дата: ${new Date().toLocaleDateString("ru-RU")}`]);
  if (project.confidence) {
    sheet.addRow([
      `Точность расчёта: ${CONFIDENCE_LABELS[project.confidence]}`,
    ]);
  }
  sheet.addRow([]);

  const header = sheet.addRow([
    "Вкл",
    "Категория",
    "Наименование",
    "Кол-во",
    "Ед.",
    "Цена",
    "Сумма",
    "Комментарий",
  ]);
  header.font = { bold: true };

  for (const line of project.lines) {
    if (mode === "client" && !line.enabled) continue;
    sheet.addRow([
      line.enabled ? "да" : "нет",
      CATEGORY_LABELS[line.category as keyof typeof CATEGORY_LABELS] ??
        line.category,
      line.name,
      line.quantity,
      UNIT_LABELS[line.unit as keyof typeof UNIT_LABELS] ?? line.unit,
      line.unitPrice,
      lineSum(line),
      line.note ?? "",
    ]);
  }

  const totals = withMargin(sumLines(project.lines), project.marginPercent);
  sheet.addRow([]);
  sheet.addRow(["", "", "Материалы и работы", "", "", "", totals.subtotal]);
  sheet.addRow([
    "",
    "",
    `Наценка ${project.marginPercent}%`,
    "",
    "",
    "",
    totals.margin,
  ]);
  const totalRow = sheet.addRow([
    "",
    "",
    "ИТОГО",
    "",
    "",
    "",
    totals.total,
  ]);
  totalRow.font = { bold: true };

  if (mode === "internal" && project.checklist?.length) {
    const tips = wb.addWorksheet("Чеклист");
    tips.addRow(["Чеклист самопроверки"]).font = { bold: true, size: 14 };
    tips.addRow(["Статус", "Правило", "Деталь"]);
    for (const c of project.checklist) {
      tips.addRow([c.status, c.label, c.detail]);
    }

    const gloss = wb.addWorksheet("Подсказки");
    gloss.addRow(["Подсказки"]).font = { bold: true, size: 14 };
    const seen = new Set<string>();
    for (const line of project.lines) {
      if (!line.helpKey || seen.has(line.helpKey)) continue;
      seen.add(line.helpKey);
      const g = getGlossary(line.helpKey);
      if (!g) continue;
      gloss.addRow([g.title, g.what, g.where, g.why, g.save]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export { formatRub };
