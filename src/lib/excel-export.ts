import type { EstimateLine, Project } from "./types";
import {
  grandTotal,
  lineTotal,
  marginAmount,
  roughOrder,
  sumEnabledLines,
} from "./estimate-engine";
import { CATEGORY_LABELS, FACADE_LABELS, UNIT_LABELS } from "./types";
import { getGlossary } from "./glossary";
import type ExcelJS from "exceljs";

export async function exportEstimateWorkbook(
  project: Project,
  options: { includeInternal: boolean } = { includeInternal: true },
): Promise<Blob> {
  const ExcelJSMod = (await import("exceljs")).default;
  const wb = new ExcelJSMod.Workbook();
  wb.creator = "Furniture Estimator";
  wb.created = new Date();

  const clientSheet = wb.addWorksheet("Клиенту");
  buildClientSheet(clientSheet, project);

  if (options.includeInternal) {
    const internal = wb.addWorksheet("Внутреннее");
    buildInternalSheet(internal, project);

    const tips = wb.addWorksheet("Подсказки");
    buildTipsSheet(tips, project.lines);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildClientSheet(sheet: ExcelJS.Worksheet, project: Project) {
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 40;
  sheet.getColumn(4).width = 10;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 36;

  sheet.addRow([`Смета: ${project.objectName} — ${project.clientName}`]).font = {
    bold: true,
    size: 14,
  };
  sheet.mergeCells(1, 1, 1, 8);
  sheet.addRow([
    `Дата: ${new Date(project.updatedAt).toLocaleDateString("ru-RU")}`,
  ]);
  sheet.mergeCells(2, 1, 2, 8);
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
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EEF5" },
  };

  for (const line of project.lines) {
    if (!line.enabled) continue;
    sheet.addRow([
      "да",
      CATEGORY_LABELS[line.category] ?? line.category,
      line.name,
      line.quantity,
      UNIT_LABELS[line.unit] ?? line.unit,
      line.unitPrice,
      lineTotal(line),
      line.note ?? "",
    ]);
  }

  const sub = sumEnabledLines(project.lines);
  const margin = marginAmount(project.lines, project.marginPercent);
  const total = grandTotal(project.lines, project.marginPercent);
  const rough = roughOrder(total);

  sheet.addRow([]);
  sheet.addRow(["", "", "Итого материалы и работы", "", "", "", sub]);
  sheet.addRow([
    "",
    "",
    `Наценка ${project.marginPercent}%`,
    "",
    "",
    "",
    margin,
  ]);
  const totalRow = sheet.addRow(["", "", "ИТОГО для клиента", "", "", "", total]);
  totalRow.font = { bold: true };
  sheet.addRow(["", "", "Порядок цены (±100 тыс.)", "", "", "", rough.label]);

  if (project.mode === "quick") {
    sheet.addRow([]);
    sheet.addRow([
      "Параметры быстрой прикидки",
      "",
      `Низ ${project.quickInput.lowerLm} п.м., верх ${project.quickInput.upperLm} п.м., фасад: ${FACADE_LABELS[project.quickInput.facadeType]}`,
    ]);
  }
}

function buildInternalSheet(sheet: ExcelJS.Worksheet, project: Project) {
  sheet.addRow(["Внутренняя смета (себестоимость + все строки)"]).font = {
    bold: true,
    size: 14,
  };
  sheet.addRow([`Маржа задана: ${project.marginPercent}%`]);
  sheet.addRow([]);
  const header = sheet.addRow([
    "Вкл",
    "Категория",
    "Наименование",
    "Кол-во",
    "Ед.",
    "Цена",
    "Сумма",
    "helpKey",
    "Комментарий",
  ]);
  header.font = { bold: true };

  for (const line of project.lines) {
    sheet.addRow([
      line.enabled ? "да" : "нет",
      CATEGORY_LABELS[line.category] ?? line.category,
      line.name,
      line.quantity,
      UNIT_LABELS[line.unit] ?? line.unit,
      line.unitPrice,
      lineTotal(line),
      line.helpKey ?? "",
      line.note ?? "",
    ]);
  }

  const sub = sumEnabledLines(project.lines);
  const margin = marginAmount(project.lines, project.marginPercent);
  sheet.addRow([]);
  sheet.addRow(["", "", "Себестоимость (вкл. строки)", "", "", "", sub]);
  sheet.addRow(["", "", "Маржа", "", "", "", margin]);
  sheet.addRow([
    "",
    "",
    "Клиентский итог",
    "",
    "",
    "",
    grandTotal(project.lines, project.marginPercent),
  ]);
}

function buildTipsSheet(sheet: ExcelJS.Worksheet, lines: EstimateLine[]) {
  sheet.addRow(["Подсказки по статьям сметы"]).font = { bold: true, size: 14 };
  sheet.addRow([]);
  sheet.addRow(["Статья", "Что это", "Где", "Зачем", "Как сэкономить"]).font = {
    bold: true,
  };

  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.helpKey || seen.has(line.helpKey)) continue;
    seen.add(line.helpKey);
    const g = getGlossary(line.helpKey);
    if (!g) continue;
    sheet.addRow([g.title, g.what, g.where, g.why, g.save]);
  }

  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 40;
  sheet.getColumn(3).width = 36;
  sheet.getColumn(4).width = 40;
  sheet.getColumn(5).width = 40;
}
