import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_PRICE_SEEDS } from "@/lib/demo-prices";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prices = await prisma.priceItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ prices });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    action?: string;
    item?: {
      key: string;
      category: string;
      name: string;
      unit: string;
      price: number;
      note?: string;
      helpKey?: string;
    };
    items?: Array<{
      key?: string;
      category: string;
      name: string;
      unit: string;
      price: number;
      note?: string;
      helpKey?: string;
    }>;
  };

  if (body.action === "reset-demo") {
    await prisma.priceItem.deleteMany({ where: { userId: session.user.id } });
    await prisma.priceItem.createMany({
      data: DEMO_PRICE_SEEDS.map((p) => ({
        userId: session.user.id,
        key: p.key,
        category: p.category,
        name: p.name,
        unit: p.unit,
        price: p.price,
        note: p.note ?? "",
        helpKey: p.helpKey,
      })),
    });
    const prices = await prisma.priceItem.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ prices });
  }

  if (body.action === "import" && body.items?.length) {
    let i = 0;
    for (const item of body.items) {
      const key =
        item.key?.trim() ||
        `import-${item.name.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}-${i++}`;
      await prisma.priceItem.upsert({
        where: {
          userId_key: { userId: session.user.id, key },
        },
        update: {
          category: item.category,
          name: item.name,
          unit: item.unit,
          price: item.price,
          note: item.note ?? "",
          helpKey: item.helpKey,
        },
        create: {
          userId: session.user.id,
          key,
          category: item.category,
          name: item.name,
          unit: item.unit,
          price: item.price,
          note: item.note ?? "",
          helpKey: item.helpKey,
        },
      });
    }
    const prices = await prisma.priceItem.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ prices });
  }

  if (body.item) {
    const item = await prisma.priceItem.upsert({
      where: {
        userId_key: { userId: session.user.id, key: body.item.key },
      },
      update: {
        category: body.item.category,
        name: body.item.name,
        unit: body.item.unit,
        price: body.item.price,
        note: body.item.note ?? "",
        helpKey: body.item.helpKey,
      },
      create: {
        userId: session.user.id,
        ...body.item,
        note: body.item.note ?? "",
      },
    });
    return NextResponse.json({ item });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    id: string;
    patch: Partial<{
      name: string;
      category: string;
      unit: string;
      price: number;
      note: string;
    }>;
  };
  const existing = await prisma.priceItem.findFirst({
    where: { id: body.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const item = await prisma.priceItem.update({
    where: { id: body.id },
    data: body.patch,
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prisma.priceItem.deleteMany({
    where: { id, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
