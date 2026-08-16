import { NextResponse } from "next/server";
import React from "react";
import { auth } from "@/lib/auth";
import {
  checklistConfidence,
  evaluateChecklist,
  type ChecklistStatus,
} from "@/lib/checklist";
import { formatRub, sumLines, withMargin } from "@/lib/line-engine";
import { getProjectForUser, parseJson } from "@/lib/project-access";
import type { Role } from "@/lib/roles";
import { CONFIDENCE_LABELS, type Confidence } from "@/lib/types";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

type Ctx = { params: Promise<{ id: string }> };

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 8 },
  meta: { marginBottom: 4, color: "#444" },
  section: { marginTop: 16, marginBottom: 8, fontSize: 13 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 4,
  },
  warn: { marginTop: 4, color: "#8a4b08" },
  total: { marginTop: 12, fontSize: 14 },
});

export async function POST(_req: Request, ctx: Ctx) {
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
  const totals = withMargin(sumLines(project.lines), project.marginPercent);
  const missing = checklist.filter((c) => c.status === "missing");

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        Text,
        { style: styles.title },
        `Смета: ${project.objectName}`,
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        `Клиент: ${project.clientName}`,
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        `Дата: ${new Date().toLocaleDateString("ru-RU")}`,
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        `Точность: ${CONFIDENCE_LABELS[confidence]}`,
      ),
      React.createElement(Text, { style: styles.section }, "Позиции"),
      ...project.lines
        .filter((l) => l.enabled)
        .map((l) =>
          React.createElement(
            View,
            { style: styles.row, key: l.id },
            React.createElement(
              Text,
              { style: { width: "70%" } },
              l.name,
            ),
            React.createElement(
              Text,
              {},
              formatRub(l.quantity * l.unitPrice),
            ),
          ),
        ),
      React.createElement(
        Text,
        { style: styles.total },
        `Итого с наценкой ${project.marginPercent}%: ${formatRub(totals.total)}`,
      ),
      React.createElement(
        Text,
        { style: styles.section },
        "Что уточнить",
      ),
      ...(missing.length
        ? missing.map((m) =>
            React.createElement(
              Text,
              { style: styles.warn, key: m.ruleId },
              `• ${m.label}: ${m.detail}`,
            ),
          )
        : [
            React.createElement(
              Text,
              { key: "ok" },
              "Критических пропусков по чеклисту не найдено.",
            ),
          ]),
      React.createElement(
        Text,
        { style: { marginTop: 20, fontSize: 9, color: "#666" } },
        "Документ сформирован автоматически как ориентировочный расчёт. Не является договором.",
      ),
    ),
  );

  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  const filename = `smeta-${project.objectName.replace(/\s+/g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
