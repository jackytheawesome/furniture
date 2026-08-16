import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const where =
    session.user.role === "ADMIN"
      ? {}
      : { userId: session.user.id, status: "ACTIVE" };

  const projects = await prisma.project.findMany({
    where: session.user.role === "ADMIN" ? where : { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { cartItems: true, lines: true } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    clientName?: string;
    objectName?: string;
    notes?: string;
    marginPercent?: number;
  };
  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      clientName: body.clientName?.trim() || "Клиент",
      objectName: body.objectName?.trim() || "Объект",
      notes: body.notes ?? "",
      marginPercent: body.marginPercent ?? 25,
      visualHints: JSON.stringify({ enabled: false }),
    },
  });
  return NextResponse.json({ project });
}
